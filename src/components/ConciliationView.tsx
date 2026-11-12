import React, { useMemo, useState } from 'react';
import {
  UploadCloud, FileText, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, RotateCcw,
} from 'lucide-react';
import { Account, Category, Transaction } from '../types/finance';
import { formatCurrency, formatDateBR } from '../services/currency';
import { parseBankStatementCsv } from '../services/bankStatementParser';
import { parseBankStatementOfx } from '../services/bankStatementOfxParser';

interface ConciliationViewProps {
  accounts: Account[];
  categories: Category[];
  existingTransactions: Transaction[];
  onImportTransactions: (imported: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>) => void;
}

interface ParsedRow {
  data: string;
  descricao: string;
  valorCentavos: number;
  tipo: 'RECEITA' | 'DESPESA';
  categoriaId: string;
  idExterno?: string;
  isDuplicate: boolean;
  selected: boolean;
}

type ImportFormat = 'CSV' | 'OFX';

function normalizeDescription(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseMoneyInput(value: string): number | null {
  const raw = value.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!raw) return null;
  let normalized = raw;
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) && Number.isSafeInteger(Math.round(amount * 100))
    ? Math.round(amount * 100)
    : null;
}

export const ConciliationView: React.FC<ConciliationViewProps> = ({
  accounts, categories, existingTransactions, onImportTransactions,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState<ImportFormat>('CSV');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'INPUT' | 'PREVIEW' | 'COMPLETED'>('INPUT');
  const [parseErrors, setParseErrors] = useState<Array<{ lineNumber: number; message: string }>>([]);
  const [allowMismatch, setAllowMismatch] = useState(false);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const netMovement = useMemo(
    () => parsedRows.reduce((sum, row) => sum + (row.tipo === 'RECEITA' ? row.valorCentavos : -row.valorCentavos), 0),
    [parsedRows],
  );
  const openingCents = parseMoneyInput(openingBalance);
  const closingCents = parseMoneyInput(closingBalance);
  const expectedClosing = openingCents !== null ? openingCents + netMovement : null;
  const difference = expectedClosing !== null && closingCents !== null ? closingCents - expectedClosing : null;
  const selectedCount = parsedRows.filter((row) => row.selected).length;
  const hasDuplicates = parsedRows.some((row) => row.isDuplicate);

  const suggestCategory = (description: string, type: 'RECEITA' | 'DESPESA'): string => {
    const d = normalizeDescription(description);
    let suggestedId = '';
    if (type === 'RECEITA') {
      if (d.includes('salario') || d.includes('pro-labore') || d.includes('prolabore')) suggestedId = 'cat-rec-01';
      else if (d.includes('dividend') || d.includes('rendimento') || d.includes('jcp')) suggestedId = 'cat-rec-03';
    } else if (d.includes('condominio') || d.includes('aluguel') || d.includes('iptu')) suggestedId = 'cat-desp-01';
    else if (d.includes('mercado') || d.includes('supermercado') || d.includes('pao de acucar') || d.includes('carrefour')) suggestedId = 'cat-desp-02';
    else if (d.includes('posto') || d.includes('combustivel') || d.includes('uber') || d.includes('estapar')) suggestedId = 'cat-desp-03';
    else if (d.includes('farmacia') || d.includes('droga') || d.includes('hospital') || d.includes('medico')) suggestedId = 'cat-desp-04';
    else if (d.includes('restaurante') || d.includes('lanche') || d.includes('ifood') || d.includes('outback')) suggestedId = 'cat-desp-06';
    else if (d.includes('netflix') || d.includes('spotify') || d.includes('vivo') || d.includes('claro')) suggestedId = 'cat-desp-07';
    return categories.find((category) => category.id === suggestedId && category.tipo === type)?.id
      || categories.find((category) => category.tipo === type && normalizeDescription(category.nome).includes('outros'))?.id
      || categories.find((category) => category.tipo === type)?.id
      || '';
  };

  const processStatement = (source: string, sourceFormat: ImportFormat) => {
    if (!source.trim()) {
      alert('Selecione um arquivo ou cole o conteúdo do extrato.');
      return;
    }
    if (!selectedAccountId) {
      alert('Cadastre ou selecione uma conta bancária antes de importar.');
      return;
    }

    const parsed = sourceFormat === 'OFX' ? parseBankStatementOfx(source) : parseBankStatementCsv(source);
    const seenInFile = new Set<string>();
    const rows: ParsedRow[] = parsed.rows.map((item) => {
      const type = item.valorCentavos < 0 ? 'DESPESA' : 'RECEITA';
      const amount = Math.abs(item.valorCentavos);
      const normalized = normalizeDescription(item.descricao);
      const fallbackKey = [selectedAccountId, item.data, type, amount, normalized].join('|');
      const externalKey = item.idExterno ? 'FITID:' + item.idExterno : fallbackKey;
      const duplicateInFile = seenInFile.has(externalKey);
      seenInFile.add(externalKey);
      const duplicateInSystem = existingTransactions.some((transaction) => {
        if (transaction.isDeleted || transaction.contaId !== selectedAccountId) return false;
        if (item.idExterno && transaction.idExterno === item.idExterno) return true;
        return transaction.tipo === type
          && transaction.valorCentavos === amount
          && transaction.data === item.data
          && normalizeDescription(transaction.descricao) === normalized;
      });
      return {
        data: item.data,
        descricao: item.descricao,
        valorCentavos: amount,
        tipo: type,
        categoriaId: suggestCategory(item.descricao, type),
        ...(item.idExterno ? { idExterno: item.idExterno } : {}),
        isDuplicate: duplicateInFile || duplicateInSystem,
        selected: !(duplicateInFile || duplicateInSystem),
      };
    });

    setParseErrors(parsed.errors);
    if (sourceFormat === 'OFX' && 'closingBalanceCentavos' in parsed && parsed.closingBalanceCentavos != null) {
      setClosingBalance((parsed.closingBalanceCentavos / 100).toFixed(2).replace('.', ','));
    }
    if (rows.length === 0) {
      alert(parsed.errors.length
        ? 'Nenhuma transação válida foi encontrada. Verifique os erros do extrato.'
        : 'Não foi possível identificar transações válidas no extrato.');
      return;
    }
    setParsedRows(rows);
    setAllowMismatch(false);
    setStep('PREVIEW');
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'ofx' && extension !== 'txt') {
      alert('Formato não suportado. Selecione um arquivo CSV ou OFX.');
      return;
    }
    const source = await file.text();
    const detectedFormat: ImportFormat = extension === 'ofx' || /<OFX[\s>]/i.test(source) ? 'OFX' : 'CSV';
    setFileName(file.name);
    setFormat(detectedFormat);
    setRawText(source);
    processStatement(source, detectedFormat);
  };

  const handleConfirmImport = () => {
    const selectedRows = parsedRows.filter((row) => row.selected);
    if (selectedRows.length === 0) {
      alert('Nenhuma linha selecionada para importação.');
      return;
    }
    if (difference === null) {
      alert('Informe o saldo inicial e o saldo final para concluir a conciliação.');
      return;
    }
    if (difference !== 0 && !allowMismatch) {
      alert('O saldo final não confere. Marque a confirmação de divergência para prosseguir conscientemente.');
      return;
    }
    const toImport = selectedRows.map((row) => ({
      data: row.data,
      competencia: row.data.substring(0, 7),
      descricao: row.descricao,
      tipo: row.tipo,
      categoriaId: row.categoriaId,
      contaId: selectedAccountId,
      formaPagamento: format === 'OFX' ? 'Extrato Bancário OFX' : 'Extrato Bancário CSV',
      valorCentavos: row.valorCentavos,
      status: 'REALIZADO' as const,
      origem: format === 'OFX' ? 'OFX_IMPORT' as const : 'CSV_IMPORT' as const,
      ...(row.idExterno ? { idExterno: row.idExterno } : {}),
      observacoes: 'Importação bancária revisada e confirmada pelo usuário',
    }));
    onImportTransactions(toImport);
    setStep('COMPLETED');
  };

  const loadSampleStatement = () => {
    setFormat('CSV');
    setFileName('exemplo-extrato.csv');
    setRawText('Data;Descrição;Valor\n08/11/2026;Supermercado Pão de Açúcar Jardins;-425,80\n09/11/2026;Posto Ipiranga Combustível;-180,00\n10/11/2026;Restaurante Jardins Almoço;-85,00\n11/11/2026;Farmácia Droga Raia;-142,50\n11/11/2026;Honorários Consultoria Recebidos;4500,00');
    setOpeningBalance('10000,00');
    setClosingBalance('13666,70');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            <span>Importação & Conciliação Bancária</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            CSV e OFX, identificação por FITID, prevenção de duplicidades e conferência de saldos antes da gravação.
          </p>
        </div>
        <ShieldCheck className="w-6 h-6 text-emerald-600" />
      </div>

      {step === 'INPUT' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Conta bancária de destino</label>
            <button onClick={loadSampleStatement} className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer">
              Carregar extrato de exemplo
            </button>
          </div>
          <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.nome} ({account.instituicao})</option>)}
          </select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Saldo inicial do período (R$)
              <input value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="Ex.: 2.500,00"
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Saldo final do extrato (R$)
              <input value={closingBalance} onChange={(event) => setClosingBalance(event.target.value)} placeholder="Ex.: 3.120,50"
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" />
            </label>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <FileText className="w-4 h-4" /> Arquivo bancário CSV ou OFX
            </label>
            <input type="file" accept=".csv,.ofx,.txt" onChange={(event) => void handleFile(event.target.files?.[0])}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold dark:file:bg-slate-700 dark:file:text-slate-100" />
            {fileName && <p className="text-xs text-slate-500">Arquivo selecionado: {fileName} ({format})</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ou cole o conteúdo do extrato</label>
            <textarea value={rawText} onChange={(event) => setRawText(event.target.value)}
              placeholder={'CSV: Data;Descrição;Valor\n08/11/2026;Mercado;-124,50\n\nOFX: cole o conteúdo completo do arquivo'}
              className="w-full h-36 p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end">
            <button onClick={() => { const detected: ImportFormat = /<OFX[\\s>]/i.test(rawText) ? 'OFX' : 'CSV'; setFormat(detected); processStatement(rawText, detected); }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow cursor-pointer transition flex items-center gap-1.5">
              Processar e pré-visualizar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {parseErrors.length > 0 && step !== 'COMPLETED' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <strong>{parseErrors.length} aviso(s) ou linha(s) ignorada(s).</strong>
          <ul className="mt-2 list-disc pl-5 space-y-1 max-h-28 overflow-y-auto">
            {parseErrors.slice(0, 8).map((error, index) => <li key={index}>Linha {error.lineNumber}: {error.message}</li>)}
          </ul>
          {parseErrors.length > 8 && <p className="mt-1">Mais {parseErrors.length - 8} aviso(s) não exibidos.</p>}
        </div>
      )}

      {step === 'PREVIEW' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Revisão do extrato ({parsedRows.length} registros)</h3>
              <p className="text-xs text-slate-500">Conta: {selectedAccount?.nome || '—'} · {format} · Nada será gravado até sua confirmação.</p>
            </div>
            <button onClick={() => setStep('INPUT')} className="text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer">Voltar / editar</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3"><p className="text-[10px] text-slate-500">Entradas</p><p className="font-bold text-emerald-600">{formatCurrency(parsedRows.filter((row) => row.tipo === 'RECEITA').reduce((sum, row) => sum + row.valorCentavos, 0))}</p></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3"><p className="text-[10px] text-slate-500">Saídas</p><p className="font-bold text-rose-600">{formatCurrency(parsedRows.filter((row) => row.tipo === 'DESPESA').reduce((sum, row) => sum + row.valorCentavos, 0))}</p></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3"><p className="text-[10px] text-slate-500">Movimento líquido</p><p className="font-bold">{formatCurrency(netMovement)}</p></div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3"><p className="text-[10px] text-slate-500">Selecionados / duplicados</p><p className="font-bold">{selectedCount} / {parsedRows.length - selectedCount}</p></div>
          </div>

          <div className={difference === null ? 'rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs' : difference === 0 ? 'rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs' : 'rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs'}>
            <div className="flex items-center gap-2 font-bold">
              {difference === 0 ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
              Conferência de saldo
            </div>
            <p className="mt-1">Saldo inicial {openingCents === null ? 'não informado' : formatCurrency(openingCents)} + movimento líquido {formatCurrency(netMovement)} = saldo esperado {expectedClosing === null ? '—' : formatCurrency(expectedClosing)}.</p>
            <p>Saldo final informado: {closingCents === null ? 'não informado' : formatCurrency(closingCents)} · Diferença: {difference === null ? '—' : formatCurrency(difference)}</p>
            {difference !== null && difference !== 0 && (
              <label className="mt-2 flex items-start gap-2 font-semibold text-amber-800 dark:text-amber-200">
                <input type="checkbox" checked={allowMismatch} onChange={(event) => setAllowMismatch(event.target.checked)} />
                Confirmo que revisei a divergência e desejo importar mesmo assim.
              </label>
            )}
            {difference === null && <p className="mt-1 text-slate-500">Informe os dois saldos para validar a igualdade contábil antes da importação.</p>}
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead><tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3">Importar</th><th className="py-2.5 px-3">Data</th><th className="py-2.5 px-3">Descrição</th><th className="py-2.5 px-3">Tipo</th><th className="py-2.5 px-3">Categoria</th><th className="py-2.5 px-3 text-right">Valor</th><th className="py-2.5 px-3 text-center">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {parsedRows.map((row, index) => (
                  <tr key={row.idExterno || index} className={row.isDuplicate ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                    <td className="py-2.5 px-3"><input type="checkbox" checked={row.selected} onChange={(event) => setParsedRows((previous) => previous.map((item, i) => i === index ? { ...item, selected: event.target.checked } : item))} /></td>
                    <td className="py-2.5 px-3 font-mono">{formatDateBR(row.data)}</td>
                    <td className="py-2.5 px-3 font-semibold">{row.descricao}</td>
                    <td className="py-2.5 px-3">{row.tipo}</td>
                    <td className="py-2.5 px-3"><select value={row.categoriaId} onChange={(event) => setParsedRows((previous) => previous.map((item, i) => i === index ? { ...item, categoriaId: event.target.value } : item))} className="max-w-40 p-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">
                      {categories.filter((category) => category.tipo === row.tipo).map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}
                    </select></td>
                    <td className="py-2.5 px-3 text-right font-black">{formatCurrency(row.valorCentavos)}</td>
                    <td className="py-2.5 px-3 text-center">{row.isDuplicate ? <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Duplicado</span> : <span className="text-[10px] font-bold text-emerald-600">Novo</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasDuplicates && <p className="text-xs text-amber-700">Duplicados foram desmarcados automaticamente. Você pode revisar cada linha antes de confirmar.</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button onClick={() => { setStep('INPUT'); setAllowMismatch(false); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer">Cancelar</button>
            <button onClick={handleConfirmImport} disabled={selectedCount === 0 || difference === null || (difference !== 0 && !allowMismatch)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow cursor-pointer transition">
              Confirmar e gravar {selectedCount} lançamentos
            </button>
          </div>
        </div>
      )}

      {step === 'COMPLETED' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-6 h-6" /></div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Importação confirmada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{selectedCount} lançamento(s) enviados para a base financeira. A confirmação ocorreu somente após a revisão do extrato.</p>
          <button onClick={() => { setParsedRows([]); setParseErrors([]); setRawText(''); setFileName(''); setOpeningBalance(''); setClosingBalance(''); setAllowMismatch(false); setStep('INPUT'); }} className="px-5 py-2 bg-[#0B2545] hover:bg-[#1F4E79] text-white text-xs font-bold rounded-xl shadow cursor-pointer flex items-center gap-2 mx-auto">
            <RotateCcw className="w-4 h-4" /> Importar outro extrato
          </button>
        </div>
      )}
    </div>
  );
};
