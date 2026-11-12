import React, { useState } from 'react';
import {
  Wallet,
  Coins,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building2,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { FinancialSummary, Category, Transaction, Invoice, Debt, CreditCard as ICreditCard } from '../types/finance';
import { formatCurrency, formatDateBR } from '../services/currency';
import { getTop15Expenses } from '../services/financeEngine';
import { RadarAlert } from '../services/radarService';

interface DashboardViewProps {
  summary: FinancialSummary;
  categories: Category[];
  transactions: Transaction[];
  invoices: Invoice[];
  cards: ICreditCard[];
  debts: Debt[];
  radarAlerts: RadarAlert[];
  currentCompetencia: string;
  onNavigate: (tab: any) => void;
  onQuickTx: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  categories,
  transactions,
  invoices,
  cards,
  debts,
  radarAlerts,
  currentCompetencia,
  onNavigate,
  onQuickTx,
}) => {
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Top 15 Expenses excluding GRANA EXTRA
  const top15 = getTop15Expenses(transactions, categories, currentCompetencia);

  // Category breakdown for current month
  const categorySpending = categories
    .filter((c) => c.tipo === 'DESPESA')
    .map((cat) => {
      const spent = transactions
        .filter((t) => !t.isDeleted && t.categoriaId === cat.id && t.competencia === currentCompetencia && t.status === 'REALIZADO')
        .reduce((sum, t) => sum + t.valorCentavos, 0);
      return {
        ...cat,
        spentCentavos: spent,
      };
    })
    .filter((c) => c.spentCentavos > 0)
    .sort((a, b) => b.spentCentavos - a.spentCentavos);

  const totalSpentInCategories = categorySpending.reduce((sum, c) => sum + c.spentCentavos, 0) || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#1F4E79] to-[#0B2545] text-white p-6 rounded-2xl shadow-lg border border-[#1F4E79] relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="mb-1">
              <span className="text-xs text-blue-200">Competência {currentCompetencia}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Visão Patrimonial e Fluxo de Caixa
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('intelligence')}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition cursor-pointer backdrop-blur"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Consultar IA Real</span>
            </button>
            <button
              onClick={onQuickTx}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>+ Novo Lançamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Radar Urgent Alerts Banner (if any) */}
      {radarAlerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 p-4 rounded-xl flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Radar de Gastos Detectou {radarAlerts.length} Ocorrência(s)
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 font-medium">
                {radarAlerts[0].titulo}: {radarAlerts[0].mensagem}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('radar')}
            className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center space-x-1 flex-shrink-0 cursor-pointer"
          >
            <span>Ver Todas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Key Performance Indicators (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Saldo Bancário Consolidado */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saldo Consolidado
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="break-words text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(summary.saldoTotalBancosCentavos)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
            <span>Soma de todas as contas ativas</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Real</span>
          </div>
        </div>

        {/* 2. Dinheiro Disponível para Gastar (Special BF Indicator) */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-950/30 dark:via-slate-800 dark:to-slate-800 p-5 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/30 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                Disponível p/ Gastar
              </span>
              <button
                onClick={() => setShowMethodologyModal(true)}
                title="Ver metodologia de cálculo seguro"
                className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              R$
            </div>
          </div>
          <div className="break-words text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(summary.dinheiroDisponivelGastarCentavos)}
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-2 flex items-center justify-between">
            <span>Livre de faturas e compromissos</span>
            <button
              onClick={() => setShowMethodologyModal(true)}
              className="underline font-semibold hover:text-emerald-900 cursor-pointer"
            >
              Ver Cálculo
            </button>
          </div>
        </div>

        {/* 3. Receitas vs Despesas do Mês */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Fluxo do Mês
            </span>
            <div className="flex space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                <span>Receitas:</span>
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.receitasMesCentavos)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end space-x-1">
                <ArrowDownRight className="w-3 h-3 text-rose-500" />
                <span>Despesas:</span>
              </div>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(summary.despesasMesCentavos)}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-[11px]">
            <span className="text-slate-500">Resultado Líquido:</span>
            <span
              className={`font-bold ${
                summary.receitasMesCentavos - summary.despesasMesCentavos >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600'
              }`}
            >
              {formatCurrency(summary.receitasMesCentavos - summary.despesasMesCentavos)}
            </span>
          </div>
        </div>

        {/* 4. Patrimônio Líquido */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Patrimônio Líquido
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(summary.patrimonioLiquidoCentavos)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
            <span>Ativos: {formatCurrency(summary.totalAtivosCentavos)}</span>
            <span className="text-slate-400">|</span>
            <span>Passivos: {formatCurrency(summary.totalPassivosCentavos)}</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Faturas Abertas */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Faturas em Aberto</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(summary.faturasAbertasCentavos)}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('cards')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Gerenciar
          </button>
        </div>

        {/* Total de Dívidas */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Saldo Devedor Dívidas</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(summary.totalDividasCentavos)}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('debts')}
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Amortizar
          </button>
        </div>

        {/* Comprometimento dos Cartões */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Crédito Comprometido</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {summary.limiteTotalCartoesCentavos > 0
                ? `${((summary.limiteUtilizadoCartoesCentavos / summary.limiteTotalCartoesCentavos) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  summary.limiteTotalCartoesCentavos > 0
                    ? (summary.limiteUtilizadoCartoesCentavos / summary.limiteTotalCartoesCentavos) * 100
                    : 0
                )}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
            <span>Usado: {formatCurrency(summary.limiteUtilizadoCartoesCentavos)}</span>
            <span>Disp: {formatCurrency(summary.limiteDisponivelCartoesCentavos)}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Top 15 Ranking + Spending by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP 15 EXPENSES (EXCLUDING GRANA EXTRA) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  15 Maiores Despesas do Mês
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ordenadas pelo maior valor
              </p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Ver Todas
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {top15.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                Nenhuma despesa registrada nesta competência.
              </div>
            ) : (
              top15.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-700/60 transition"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.descricao}
                      </p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                        <span
                          className="px-1.5 py-0.2 rounded font-medium"
                          style={{ backgroundColor: `${item.categoriaCor}20`, color: item.categoriaCor }}
                        >
                          {item.categoriaNome}
                        </span>
                        <span>•</span>
                        <span>{formatDateBR(item.data)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(item.valorCentavos)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SPENDING BY CATEGORY DOUGHNUT / BARS */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Distribuição de Gastos por Categoria
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Proporção em relação ao volume total de despesas realizadas
              </p>
            </div>
            <button
              onClick={() => onNavigate('planning')}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Orçamento
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
            {categorySpending.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                Nenhum gasto por categoria registrado.
              </div>
            ) : (
              categorySpending.map((cat) => {
                const pct = (cat.spentCentavos / totalSpentInCategories) * 100;
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.cor }}
                        ></span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cat.nome}
                          {cat.isGranaExtra && (
                            <span className="ml-1 text-[10px] text-amber-600 font-bold">(Extra)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(cat.spentCentavos)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 w-12 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: cat.cor }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Bills & Due Dates */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Próximos Vencimentos & Compromissos
            </h3>
          </div>
          <span className="text-xs text-slate-500">Agendamentos para os próximos dias</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Invoices to pay */}
          {invoices
            .filter((inv) => inv.status === 'ABERTA' || inv.status === 'PARCIALMENTE_PAGA')
            .map((inv) => {
              const card = cards.find((c) => c.id === inv.cartaoId);
              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Fatura {card?.nome || 'Cartão'}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                      Venc. {formatDateBR(inv.dataVencimento)}
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {formatCurrency(inv.saldoRestanteCentavos)}
                  </div>
                  <button
                    onClick={() => onNavigate('cards')}
                    className="mt-3 w-full py-1.5 bg-[#0B2545] hover:bg-[#1F4E79] text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Liquidar Fatura
                  </button>
                </div>
              );
            })}

          {/* Pending debt installments */}
          {debts
            .filter((d) => d.status === 'EM_DIA')
            .slice(0, 2)
            .map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {d.credor}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Venc. {formatDateBR(d.proximoVencimento)}
                  </span>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {formatCurrency(d.valorParcelaCentavos)}
                </div>
                <div className="text-[11px] text-slate-500 mt-2 flex justify-between">
                  <span>Restam {d.parcelasRestantes} parcelas</span>
                  <span className="font-semibold text-emerald-600">Em dia</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Methodology Explainer Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Info className="w-5 h-5 text-emerald-600" />
                <span>Metodologia: Dinheiro Disponível para Gastar</span>
              </h3>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              O indicador <strong>Dinheiro Disponível para Gastar</strong> foi projetado segundo os princípios fundamentais do Financeiro Barbosa Fernandes para evitar qualquer falsa sensação de liquidez.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>(+) Saldo Bancário Consolidado:</span>
                <span>{formatCurrency(summary.saldoTotalBancosCentavos)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>(-) Despesas Pendentes do Mês:</span>
                <span>-{formatCurrency(summary.despesasPendentesMesCentavos)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>(-) Faturas de Cartão a Vencer:</span>
                <span>-{formatCurrency(summary.faturasAbertasCentavos)}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>(=) Dinheiro Seguro Disponível:</span>
                <span className="text-emerald-600">{formatCurrency(summary.dinheiroDisponivelGastarCentavos)}</span>
              </div>
            </div>

            <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
              <strong>Regra de Integridade:</strong> Receitas futuras/previstas <u>nunca</u> são somadas neste indicador, garantindo que você nunca gaste dinheiro que ainda não caiu na conta.
            </div>

            <button
              onClick={() => setShowMethodologyModal(false)}
              className="w-full py-2 bg-[#0B2545] text-white font-bold text-xs rounded-xl hover:bg-[#1F4E79] transition cursor-pointer"
            >
              Compreendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
