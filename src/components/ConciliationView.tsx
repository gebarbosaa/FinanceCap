import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Account, Category, Transaction } from '../types/finance';
import { formatCurrency, formatDateBR } from '../services/currency';
import { parseBankStatementCsv } from '../services/bankStatementParser';

interface ConciliationViewProps {
  accounts: Account[];
  categories: Category[];
  existingTransactions: Transaction[];
  onImportTransactions: (imported: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>) => void;
}

interface ParsedRow {
  data: string; // YYYY-MM-DD
  descricao: string;
  valorCentavos: number;
  tipo: 'RECEITA' | 'DESPESA';
  categoriaId: string;
  isDuplicate: boolean;
  selected: boolean;
}

export const ConciliationView: React.FC<ConciliationViewProps> = ({
  accounts,
  categories,
  existingTransactions,
  onImportTransactions,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'INPUT' | 'PREVIEW' | 'COMPLETED'>('INPUT');
  const [parseErrors, setParseErrors] = useState<Array<{ lineNumber: number; message: string }>>([]);

  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // Heuristic category suggestion based on common Brazilian bank keywords
  const suggestCategory = (desc: string): string => {
    const d = desc.toLowerCase();
    if (d.includes('salario') || d.includes('pro-labore') || d.includes('prolabore')) return 'cat-rec-01';
    if (d.includes('dividend') || d.includes('rendimento') || d.includes('jcp')) return 'cat-rec-03';
    if (d.includes('condominio') || d.includes('aluguel') || d.includes('iptu')) return 'cat-desp-01';
    if (d.includes('mercado') || d.includes('supermercado') || d.includes('pao de acucar') || d.includes('carrefour')) return 'cat-desp-02';
    if (d.includes('posto') || d.includes('combustivel') || d.includes('uber') || d.includes('estapar')) return 'cat-desp-03';
    if (d.includes('farmacia') || d.includes('droga') || d.includes('hospital') || d.includes('medico') || d.includes('laboratorio')) return 'cat-desp-04';
    if (d.includes('restaurante') || d.includes('lanche') || d.includes('ifood') || d.includes('outback')) return 'cat-desp-06';
    if (d.includes('netflix') || d.includes('spotify') || d.includes('vivo') || d.includes('claro')) return 'cat-desp-07';
    return 'cat-desp-12'; // Outros
  };

  const handleParseCsv = () => {
    if (!csvText.trim()) {
      alert('Cole o conteúdo do extrato CSV para prosseguir.');
      return;
    }
    if (!selectedAccountId) {
      alert('Cadastre ou selecione uma conta bancária antes de importar.');
      return;
    }

    const parsed = parseBankStatementCsv(csvText);
    const seenInFile = new Set<string>();
    const rows: ParsedRow[] = parsed.rows.map((item) => {
      const isNegative = item.valorCentavos < 0;
      const valorCentavos = Math.abs(item.valorCentavos);
      const tipo = isNegative ? 'DESPESA' : 'RECEITA';
      const normalizedDescription = item.descricao.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
      const duplicateKey = [selectedAccountId, item.data, tipo, valorCentavos, normalizedDescription].join('|');
      const duplicateInFile = seenInFile.has(duplicateKey);
      seenInFile.add(duplicateKey);
      const isDuplicate = duplicateInFile || existingTransactions.some((transaction) =>
        !transaction.isDeleted &&
        transaction.contaId === selectedAccountId &&
        transaction.tipo === tipo &&
        transaction.valorCentavos === valorCentavos &&
        transaction.data === item.data &&
        transaction.descricao.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim() === normalizedDescription
      );
      const suggestedId = suggestCategory(item.descricao);
      const suggestedCategory = categories.find((category) => category.id === suggestedId && category.tipo === tipo)
        || categories.find((category) => category.tipo === tipo && category.nome.toLowerCase().includes('outros'))
        || categories.find((category) => category.tipo === tipo);

      return {
        data: item.data,
        descricao: item.descricao,
        valorCentavos,
        tipo,
        categoriaId: suggestedCategory?.id || '',
        isDuplicate,
        selected: !isDuplicate,
      };
    });

    setParseErrors(parsed.errors);
    if (rows.length === 0) {
      alert(parsed.errors.length
        ? 'Nenhuma linha válida foi encontrada. Corrija os erros indicados e tente novamente.'
        : 'Não foi possível identificar transações válidas no extrato.');
      return;
    }
    setParsedRows(rows);
    setStep('PREVIEW');
  };

  const handleConfirmImport = () => {
    const selectedRows = parsedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      alert('Nenhuma linha selecionada para importação.');
      return;
    }

    const toImport = selectedRows.map((r) => ({
      data: r.data,
      competencia: r.data.substring(0, 7),
      descricao: r.descricao,
      tipo: r.tipo,
      categoriaId: r.categoriaId,
      contaId: selectedAccountId,
      formaPagamento: 'Extrato Bancário',
      valorCentavos: r.valorCentavos,
      status: 'REALIZADO' as const,
      origem: 'CSV_IMPORT' as const,
      observacoes: 'Importação e conciliação bancária via extrato CSV',
    }));

    onImportTransactions(toImport);
    setStep('COMPLETED');
  };

  const loadSampleStatement = () => {
    const sample = `Data;Descrição;Valor;Categoria
08/11/2026;Supermercado Pão de Açúcar Jardins;-425,80;Alimentação
09/11/2026;Posto Ipiranga Combustivel;-180,00;Transporte
10/11/2026;Restaurante Jardins Almoço;-85,00;Alimentação
11/11/2026;Farmacia Droga Raia;-142,50;Saúde
11/11/2026;Honorarios Consultoria Recebidos;4500,00;Receita`;
    setCsvText(sample);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            <span>Importação & Conciliação de Extratos CSV</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Normalização de datas e centavos, detecção de duplicidades, sugestão de categorias e pré-visualização auditada.
          </p>
        </div>
      </div>

      {step === 'INPUT' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Conta Bancária de Destino da Conciliação:
            </label>
            <button
              onClick={loadSampleStatement}
              className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              Carregar Exemplo de Extrato Bancário
            </button>
          </div>

          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.nome} ({acc.instituicao})
              </option>
            ))}
          </select>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Cole o conteúdo CSV do Extrato (ponto e vírgula ou vírgula):
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Data;Descrição;Valor&#10;08/11/2026;Supermercado;-124,50&#10;09/11/2026;Combustível;-180,00"
              className="w-full h-44 p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleParseCsv}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow cursor-pointer transition flex items-center space-x-1.5"
            >
              <span>Processar & Pré-Visualizar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {parseErrors.length > 0 && step !== 'COMPLETED' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <strong>{parseErrors.length} linha(s) ignorada(s) por inconsistência.</strong>
          <ul className="mt-2 list-disc pl-5 space-y-1 max-h-28 overflow-y-auto">
            {parseErrors.slice(0, 8).map((error) => (
              <li key={`${error.lineNumber}-${error.message}`}>Linha {error.lineNumber}: {error.message}</li>
            ))}
          </ul>
          {parseErrors.length > 8 && <p className="mt-1">Mais {parseErrors.length - 8} erro(s) não exibidos.</p>}
        </div>
      )}

      {step === 'PREVIEW' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Pré-Visualização e Validação do Extrato ({parsedRows.length} registros)
              </h3>
              <p className="text-xs text-slate-500">
                Revise as linhas identificadas e as categorias sugeridas antes da gravação definitiva.
              </p>
            </div>

            <button
              onClick={() => setStep('INPUT')}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
            >
              Voltar / Editar
            </button>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Importar?</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Categoria Sugerida</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-center">Duplicidade?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {parsedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                      row.isDuplicate ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => {
                          const updated = [...parsedRows];
                          updated[idx].selected = e.target.checked;
                          setParsedRows(updated);
                        }}
                        className="rounded text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono">{formatDateBR(row.data)}</td>
                    <td className="py-2.5 px-3 font-semibold">{row.descricao}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          row.tipo === 'RECEITA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={row.categoriaId}
                        onChange={(e) => {
                          const updated = [...parsedRows];
                          updated[idx].categoriaId = e.target.value;
                          setParsedRows(updated);
                        }}
                        className="p-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      {formatCurrency(row.valorCentavos)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.isDuplicate ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Já Existente
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600">Novo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setStep('INPUT')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
            >
              Gravar {parsedRows.filter((r) => r.selected).length} Lançamentos na Base
            </button>
          </div>
        </div>
      )}

      {step === 'COMPLETED' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
            Importação Concluída com Sucesso!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Os lançamentos foram contabilizados no saldo da conta e registrados no Log de Auditoria.
          </p>
          <button
            onClick={() => {
              setParsedRows([]);
              setParseErrors([]);
              setCsvText('');
              setStep('INPUT');
            }}
            className="px-5 py-2 bg-[#0B2545] hover:bg-[#1F4E79] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
          >
            Importar Outro Extrato
          </button>
        </div>
      )}
    </div>
  );
};
