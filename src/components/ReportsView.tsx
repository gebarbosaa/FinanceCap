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
  const reportYear = String(data.settings.anoReferencia);
  const yearTransactions = data.transactions.filter((tx) => !tx.isDeleted && tx.competencia.startsWith(reportYear) && tx.status === 'REALIZADO');
  const annualIncome = yearTransactions.filter((tx) => tx.tipo === 'RECEITA').reduce((sum, tx) => sum + tx.valorCentavos, 0);
  const annualExpenses = yearTransactions.filter((tx) => tx.tipo === 'DESPESA').reduce((sum, tx) => sum + tx.valorCentavos, 0);
  const savingsRate = annualIncome > 0 ? ((annualIncome - annualExpenses) / annualIncome) * 100 : null;
  const totalDebt = data.debts.filter((debt) => debt.status !== 'QUITADO').reduce((sum, debt) => sum + debt.saldoDevedorCentavos, 0);
  const registeredAssets = data.patrimony.filter((item) => item.tipo === 'ATIVO').reduce((sum, item) => sum + item.valorAvaliacaoCentavos, 0);
  const debtToAssets = registeredAssets > 0 ? (totalDebt / registeredAssets) * 100 : null;
  const investedPrincipal = data.investments.reduce((sum, item) => sum + item.valorInvestidoCentavos, 0);
  const weightedReturn = investedPrincipal > 0
    ? data.investments.reduce((sum, item) => sum + item.valorInvestidoCentavos * item.rentabilidadeHistoricaPercentual, 0) / investedPrincipal
    : null;
  const averageMonthlyExpense = annualExpenses / 12;
  const cashLiquidity = averageMonthlyExpense > 0
    ? data.accounts.filter((account) => account.ativo).reduce((sum, account) => sum + account.saldoInicialCentavos, 0) / averageMonthlyExpense
    : null;
  const monthIndex = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'].indexOf(selectedSheet);
  const monthlyRows = monthIndex >= 0
    ? data.transactions.filter((tx) => !tx.isDeleted && tx.competencia === `${reportYear}-${String(monthIndex + 1).padStart(2, '0')}`).sort((a, b) => a.data.localeCompare(b.data))
    : [];


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
                    ? 'bg-orange-500 text-white'
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
                <span className="text-emerald-800 text-[10px] uppercase font-bold block">Taxa de poupança no ano</span>
                <span className="text-base font-black text-emerald-600">{savingsRate === null ? 'Sem dados' : `${savingsRate.toFixed(1)}% da renda`}</span>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
                <span className="text-blue-800 text-[10px] uppercase font-bold block">Liquidez em meses de despesa média</span>
                <span className="text-base font-black text-blue-600">{cashLiquidity === null ? 'Sem dados' : `${cashLiquidity.toFixed(1)} meses`}</span>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200">
                <span className="text-indigo-800 text-[10px] uppercase font-bold block">Dívida sobre ativos cadastrados</span>
                <span className="text-base font-black text-indigo-600">{debtToAssets === null ? 'Sem dados' : `${debtToAssets.toFixed(1)}% dos ativos`}</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
                <span className="text-amber-800 text-[10px] uppercase font-bold block">Rentabilidade histórica ponderada</span>
                <span className="text-base font-black text-amber-600">{weightedReturn === null ? 'Sem dados' : `${weightedReturn.toFixed(1)}% histórico`}</span>
              </div>
            </div>
          </div>
        )}

        {monthIndex >= 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Lançamentos registrados em {selectedSheet} de {reportYear}.</p>
            {monthlyRows.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-xs text-slate-500">Nenhum lançamento encontrado para esta competência.</p> : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50"><tr><th className="p-3">Data</th><th className="p-3">Descrição</th><th className="p-3">Tipo</th><th className="p-3">Status</th><th className="p-3 text-right">Valor</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{monthlyRows.map((tx) => <tr key={tx.id}><td className="p-3 whitespace-nowrap">{formatDateBR(tx.data)}</td><td className="p-3">{tx.descricao}</td><td className="p-3">{tx.tipo}</td><td className="p-3">{tx.status}</td><td className="p-3 text-right font-semibold">{formatCurrency(tx.valorCentavos)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {selectedSheet !== 'CONSOLIDAÇÃO' && selectedSheet !== 'INDICADORES ANUAIS' && monthIndex < 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-xs text-slate-600 dark:text-slate-300">
            <strong>{selectedSheet}</strong>: a visualização detalhada desta aba ainda não foi implementada no painel. Não exibiremos dados fictícios. Use a sincronização para abrir a planilha correspondente no Google Sheets.
            <div className="mt-3"><button type="button" onClick={onOpenSheetsSync} className="rounded-lg bg-orange-500 px-3 py-2 font-bold text-white">Abrir sincronização do Sheets</button></div>
          </div>
        )}
      </div>
    </div>
  );
};
