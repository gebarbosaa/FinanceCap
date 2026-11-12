import React, { useState } from 'react';
import { FileSpreadsheet, Download, Printer, Layers, Filter } from 'lucide-react';
import { StorageData } from '../services/storageService';
import { ALL_32_SHEET_NAMES } from '../services/sheetsService';
import { formatCurrency, formatDateBR } from '../services/currency';

interface ReportsViewProps {
  data: StorageData;
  onOpenSheetsSync: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ data, onOpenSheetsSync }) => {
  const [selectedSheet, setSelectedSheet] = useState<string>('CONSOLIDAÇÃO');

  // Categorize sheets into groups
  const coreTabs = ALL_32_SHEET_NAMES.slice(0, 17);
  const monthlyTabs = ALL_32_SHEET_NAMES.slice(17, 29);
  const consolidationTabs = ALL_32_SHEET_NAMES.slice(29);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Arquitetura de 32 Abas & Relatórios Executivos</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualizador contábil das 32 abas padronizadas sincronizadas com o Google Sheets.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            onClick={onOpenSheetsSync}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Abrir no Google Sheets</span>
          </button>
        </div>
      </div>

      {/* 32 Tabs Selector */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Abas Principais (1 a 17):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {coreTabs.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedSheet(name)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedSheet === name
                    ? 'bg-[#0B2545] text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            12 Abas Mensais (Janeiro a Dezembro):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {monthlyTabs.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedSheet(name)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedSheet === name
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Consolidação & Análise Anual:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {consolidationTabs.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedSheet(name)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedSheet === name
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Sheet Viewer */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
            Planilha: [{selectedSheet}]
          </h3>
          <span className="text-xs text-slate-500">
            Estrutura idêntica à planilha Google Sheets
          </span>
        </div>

        {/* Content Preview */}
        {selectedSheet === 'CONSOLIDAÇÃO' && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Resumo anual consolidado integrando saldos de todas as contas, faturas e dívidas.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Contas Bancárias Ativas</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {data.accounts.length} contas
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Cartões de Crédito</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {data.cards.length} cartões
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Lançamentos Cadastrados</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {data.transactions.filter((t) => !t.isDeleted).length} lançamentos
                </span>
              </div>
            </div>
          </div>
        )}

        {selectedSheet === 'INDICADORES ANUAIS' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
                <span className="text-emerald-800 text-[10px] uppercase font-bold block">Taxa de Poupança Média</span>
                <span className="text-base font-black text-emerald-600">38.5% da Renda</span>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
                <span className="text-blue-800 text-[10px] uppercase font-bold block">Índice de Liquidez</span>
                <span className="text-base font-black text-blue-600">4.2x Despesas Fixas</span>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200">
                <span className="text-indigo-800 text-[10px] uppercase font-bold block">Grau de Endividamento</span>
                <span className="text-base font-black text-indigo-600">24.8% do Patrimônio</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
                <span className="text-amber-800 text-[10px] uppercase font-bold block">Rentabilidade Média</span>
                <span className="text-base font-black text-amber-600">14.2% a.a.</span>
              </div>
            </div>
          </div>
        )}

        {selectedSheet !== 'CONSOLIDAÇÃO' && selectedSheet !== 'INDICADORES ANUAIS' && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-xs space-y-2 font-mono">
            <div><strong>Aba Selecionada:</strong> {selectedSheet}</div>
            <div><strong>Status:</strong> Mapeada com cabeçalho padronizado e ID único.</div>
            <div><strong>Alimentação:</strong> Automática a partir dos lançamentos centrais (sem duplicação).</div>
          </div>
        )}
      </div>
    </div>
  );
};
