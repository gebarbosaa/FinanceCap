import React, { useState } from 'react';
import {
  CalendarDays,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import {
  Budget,
  Category,
  Transaction,
  Account,
  InstallmentPlan,
  Debt,
  Recurrence,
} from '../types/finance';
import { formatCurrency, parseToCentavos } from '../services/currency';
import { generate12MonthProjection } from '../services/financeEngine';

interface PlanningViewProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  accounts: Account[];
  installments: InstallmentPlan[];
  debts: Debt[];
  recurrences: Recurrence[];
  currentCompetencia: string;
  onUpdateBudget: (budget: Budget) => void;
}

export const PlanningView: React.FC<PlanningViewProps> = ({
  budgets,
  categories,
  transactions,
  accounts,
  installments,
  debts,
  recurrences,
  currentCompetencia,
  onUpdateBudget,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ORCAMENTO' | 'PROJECAO_12M'>('ORCAMENTO');

  // Compute budget execution for current competence
  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  const explicitBudgets = budgets.filter((b) => b.competencia === currentCompetencia);
  const budgetByCategory = new Map(explicitBudgets.map((budget) => [budget.categoriaId, budget]));
  const effectiveBudgets = categories
    .filter((category) => category.tipo === 'DESPESA' && category.ativo !== false)
    .flatMap((category) => {
      const saved = budgetByCategory.get(category.id);
      const limit = saved?.valorPlanejadoCentavos ?? category.limiteMensalCentavos;
      if (!limit || limit <= 0) return [];
      return [{
        id: saved?.id ?? `budget-${currentCompetencia}-${category.id}`,
        competencia: currentCompetencia,
        categoriaId: category.id,
        valorPlanejadoCentavos: limit,
        alertaPercentual: saved?.alertaPercentual ?? 80,
      }];
    });

  const budgetExecution = effectiveBudgets.map((b) => {
      const cat = catMap.get(b.categoriaId);
      const spent = transactions
        .filter((t) => !t.isDeleted && t.categoriaId === b.categoriaId && t.competencia === currentCompetencia && t.status === 'REALIZADO')
        .reduce((sum, t) => sum + t.valorCentavos, 0);

      const diff = b.valorPlanejadoCentavos - spent;
      const pct = b.valorPlanejadoCentavos > 0 ? (spent / b.valorPlanejadoCentavos) * 100 : 0;
      const isOver = spent > b.valorPlanejadoCentavos;
      const isWarning = pct >= b.alertaPercentual && !isOver;

      return {
        ...b,
        categoriaNome: cat ? cat.nome : 'Categoria',
        categoriaCor: cat ? cat.cor : '#3B82F6',
        valorRealizadoCentavos: spent,
        diferencaCentavos: diff,
        percentualUtilizado: pct,
        isOver,
        isWarning,
      };
    });

  const editBudgetLimit = (budget: Budget, categoryName: string) => {
    const entered = window.prompt(`Novo limite mensal para ${categoryName} (R$):`, (budget.valorPlanejadoCentavos / 100).toFixed(2).replace('.', ','));
    if (entered === null) return;
    const valueCentavos = parseToCentavos(entered);
    if (!Number.isInteger(valueCentavos) || valueCentavos <= 0) {
      window.alert('Informe um limite maior que zero.');
      return;
    }
    onUpdateBudget({ ...budget, valorPlanejadoCentavos: valueCentavos });
  };

  // 12 Months Projection
  const projection = generate12MonthProjection(
    accounts,
    transactions,
    installments,
    debts,
    currentCompetencia,
    recurrences
  );

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveSubTab('ORCAMENTO')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'ORCAMENTO'
              ? 'bg-[#0B2545] text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Orçamento Mensal por Categoria</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PROJECAO_12M')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'PROJECAO_12M'
              ? 'bg-[#0B2545] text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Planejamento Financeiro de 12 Meses</span>
        </button>
      </div>

      {activeSubTab === 'ORCAMENTO' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Tetos Orçamentários — {currentCompetencia}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitore a execução de cada categoria contra o limite orçado e receba alertas proativos antes do estouro.
              </p>
            </div>
          </div>

          {/* Budget Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {budgetExecution.map((item) => (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm space-y-3 flex flex-col justify-between ${
                  item.isOver
                    ? 'border-rose-400 dark:border-rose-800/80'
                    : item.isWarning
                    ? 'border-amber-400 dark:border-amber-700'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.categoriaCor }}
                      ></span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.categoriaNome}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.isOver
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : item.isWarning
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {item.percentualUtilizado.toFixed(0)}% Utilizado
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.isOver ? 'bg-rose-500' : item.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.percentualUtilizado)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Planejado:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.valorPlanejadoCentavos)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Realizado:</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {formatCurrency(item.valorRealizadoCentavos)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
                  <span className="text-slate-500">
                    {item.diferencaCentavos >= 0 ? 'Disponível no Teto:' : 'Estouro:'}
                  </span>
                  <span
                    className={`font-bold ${
                      item.diferencaCentavos >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(item.diferencaCentavos)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => editBudgetLimit(item, item.categoriaNome)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-semibold text-[#1F4E79] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Ajustar limite mensal
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 12-Month Projection Matrix */
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Planejamento Financeiro de 12 Meses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Projeção matemática consolidando receitas recorrentes confirmadas, contas fixas, parcelamentos ativos e amortizações de financiamentos.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4 text-right">Receitas Previstas</th>
                  <th className="py-3 px-4 text-right">Despesas Fixas</th>
                  <th className="py-3 px-4 text-right">Parcelamentos</th>
                  <th className="py-3 px-4 text-right">Dívidas (Caixa)</th>
                  <th className="py-3 px-4 text-right">Resultado do Mês</th>
                  <th className="py-3 px-4 text-right font-black">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {projection.map((row, idx) => (
                  <tr
                    key={row.competencia}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {row.mesDescricao}
                      {idx === 0 && (
                        <span className="ml-2 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px]">
                          Atual
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      {formatCurrency(row.receitasEsperadasCentavos)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      -{formatCurrency(row.despesasFixasCentavos)}
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400">
                      -{formatCurrency(row.parcelasFuturasCentavos)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      -{formatCurrency(row.dividasParcelasCentavos)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(row.saldoProjetadoMesCentavos)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-700/20">
                      {formatCurrency(row.saldoAcumuladoCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
