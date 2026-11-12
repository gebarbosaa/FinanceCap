import React, { useEffect, useState } from 'react';
import {
  Building2,
  Car,
  TrendingUp,
  Target,
  PiggyBank,
  ShieldCheck,
  Plus,
  Coins,
} from 'lucide-react';
import {
  PatrimonyItem,
  Investment,
  Goal,
  FinancialSummary,
} from '../types/finance';
import { formatCurrency, formatDateBR } from '../services/currency';

interface PatrimonyViewProps {
  initialTab?: 'BALANCO' | 'INVESTIMENTOS' | 'METAS';
  patrimony: PatrimonyItem[];
  investments: Investment[];
  goals: Goal[];
  summary: FinancialSummary;
  onAddPatrimony: (item: Omit<PatrimonyItem, 'id'>) => void;
  onAddInvestment: (inv: Omit<Investment, 'id'>) => void;
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
}

export const PatrimonyView: React.FC<PatrimonyViewProps> = ({
  initialTab = 'BALANCO',
  patrimony,
  investments,
  goals,
  summary,
}) => {
  const [activeTab, setActiveTab] = useState<'BALANCO' | 'INVESTIMENTOS' | 'METAS'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const totalInvestments = investments.reduce((sum, inv) => sum + inv.saldoAtualCentavos, 0);

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
        <button
          onClick={() => setActiveTab('BALANCO')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'BALANCO'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Balanço Patrimonial & Bens</span>
        </button>

        <button
          onClick={() => setActiveTab('INVESTIMENTOS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'INVESTIMENTOS'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Carteira de Investimentos</span>
        </button>

        <button
          onClick={() => setActiveTab('METAS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'METAS'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Metas Financeiras & Objetivos</span>
        </button>
      </div>

      {activeTab === 'BALANCO' && (
        <div className="space-y-6">
          {/* Net Worth Card */}
          <div className="bg-gradient-to-r from-[#0B2545] to-[#1F4E79] text-white p-6 rounded-2xl shadow-lg border border-blue-900/60 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                Patrimônio Líquido Barbosa Fernandes
              </span>
              <div className="text-3xl font-black tracking-tight mt-1">
                {formatCurrency(summary.patrimonioLiquidoCentavos)}
              </div>
              <p className="text-xs text-blue-200 mt-1">
                Ativos Reais ({formatCurrency(summary.totalAtivosCentavos)}) - Passivos ({formatCurrency(summary.totalPassivosCentavos)})
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-black/20 px-4 py-2.5 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] text-blue-200 block uppercase">Ativos Totais</span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatCurrency(summary.totalAtivosCentavos)}
                </span>
              </div>
              <div className="bg-black/20 px-4 py-2.5 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] text-blue-200 block uppercase">Passivos Totais</span>
                <span className="text-sm font-bold text-rose-400">
                  {formatCurrency(summary.totalPassivosCentavos)}
                </span>
              </div>
            </div>
          </div>

          {/* Physical Assets List */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Ativos Físicos & Bens Cadastrados
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patrimony.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {item.subtipo === 'IMOVEL' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <Car className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.descricao}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Avaliação: {formatDateBR(item.dataAvaliacao)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {formatCurrency(item.valorAvaliacaoCentavos)}
                    </span>
                    <span
                      className={`block text-[10px] font-bold ${
                        item.tipo === 'ATIVO' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {item.tipo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'INVESTIMENTOS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Carteira de Investimentos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Custódia em corretoras autorizadas (XP, Itaú). Rentabilidade e marcação a mercado.
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-right">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider block">
                Patrimônio Investido
              </span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(totalInvestments)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {inv.instituicao} • {inv.categoria.replace('_', ' ')}
                    </span>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                      {inv.produto}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    +{inv.rentabilidadeHistoricaPercentual}%
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valor Aplicado:</span>
                    <span className="font-semibold">{formatCurrency(inv.valorInvestidoCentavos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Saldo Atualizado:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(inv.saldoAtualCentavos)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'METAS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Metas Financeiras & Objetivos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Planejamento de poupança mensal calculada para atingir cada objetivo no prazo desejado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const pct = (goal.valorAcumuladoCentavos / goal.valorAlvoCentavos) * 100;
              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {goal.nome}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        {goal.prioridade}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-3">{goal.descricao}</p>

                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Concluído:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Acumulado:</span>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(goal.valorAcumuladoCentavos)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Alvo:</span>
                        <span className="font-bold">{formatCurrency(goal.valorAlvoCentavos)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-semibold text-blue-600">
                        <span>Aporte Mensal:</span>
                        <span>{formatCurrency(goal.aporteMensalCentavos)} / mês</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
                    Prazo alvo: {formatDateBR(goal.prazo)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
