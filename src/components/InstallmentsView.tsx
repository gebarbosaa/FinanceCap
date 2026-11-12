import React, { useState } from 'react';
import { Layers, Calendar, CheckCircle, Clock, Zap, ArrowRight, Plus } from 'lucide-react';
import { InstallmentPlan, CreditCard, Account } from '../types/finance';
import { formatCurrency, formatDateBR } from '../services/currency';

interface InstallmentsViewProps {
  installments: InstallmentPlan[];
  cards: CreditCard[];
  accounts: Account[];
  onAddInstallment: (plan: Omit<InstallmentPlan, 'id'>) => void;
}

export const InstallmentsView: React.FC<InstallmentsViewProps> = ({
  installments,
  cards,
  accounts,
  onAddInstallment,
}) => {
  const [anticipationPlan, setAnticipationPlan] = useState<InstallmentPlan | null>(null);

  const cardMap = new Map<string, CreditCard>(cards.map((c) => [c.id, c]));

  const totalCommittedFuture = installments.reduce((sum, i) => sum + i.saldoRestanteCentavos, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Controle de Compras Parceladas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe o comprometimento de parcelas futuras e cronograma de amortização (até 48 parcelas).
          </p>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-right">
          <span className="text-[10px] text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider block">
            Total em Parcelas Futuras
          </span>
          <span className="text-lg font-black text-indigo-900 dark:text-indigo-200">
            {formatCurrency(totalCommittedFuture)}
          </span>
        </div>
      </div>

      {/* Installment Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {installments.map((plan) => {
          const card = plan.cartaoId ? cardMap.get(plan.cartaoId) : undefined;
          const progressPct = (plan.parcelasPagas / plan.totalParcelas) * 100;

          return (
            <div
              key={plan.id}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {plan.descricao}
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                    {plan.parcelasPagas} / {plan.totalParcelas} pagas
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center space-x-2 mb-4">
                  <span>💳 {card?.nome || 'Cartão'}</span>
                  <span>•</span>
                  <span>Compra em {formatDateBR(plan.dataCompra)}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Progresso de Quitação:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {progressPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Grid of values */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Valor Total:</span>
                    <span className="font-bold">{formatCurrency(plan.valorTotalCentavos)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Valor Parcela:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(plan.valorParcelaCentavos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Saldo Restante:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(plan.saldoRestanteCentavos)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Faltam {plan.parcelasFuturas} meses
                </span>
                <button
                  onClick={() => setAnticipationPlan(plan)}
                  className="flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simular Antecipação</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Anticipation Simulation Modal */}
      {anticipationPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>Simulador de Antecipação</span>
              </h3>
              <button
                onClick={() => setAnticipationPlan(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Antecipar as parcelas de <strong>{anticipationPlan.descricao}</strong> liberará imediatamente o seu limite de crédito no cartão e desobstruirá seu fluxo de caixa mensal.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Parcelas Restantes:</span>
                <span className="font-bold">{anticipationPlan.parcelasFuturas} parcelas</span>
              </div>
              <div className="flex justify-between">
                <span>Alívio no Fluxo Mensal:</span>
                <span className="font-bold text-emerald-600">
                  +{formatCurrency(anticipationPlan.valorParcelaCentavos)} / mês
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Custo para Quitação Total:</span>
                <span className="text-indigo-600">
                  {formatCurrency(anticipationPlan.saldoRestanteCentavos)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAnticipationPlan(null)}
              className="w-full py-2 bg-[#0B2545] text-white text-xs font-bold rounded-xl hover:bg-[#1F4E79] transition cursor-pointer"
            >
              Fechar Simulação
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
