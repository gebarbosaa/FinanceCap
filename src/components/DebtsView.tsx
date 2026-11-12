import React, { useState } from 'react';
import { Landmark, AlertCircle, Calculator, TrendingDown, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { Debt } from '../types/finance';
import { formatCurrency, formatDateBR } from '../services/currency';

interface DebtsViewProps {
  debts: Debt[];
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({ debts, onAddDebt }) => {
  const [amortizeAmount, setAmortizeAmount] = useState<string>('20000');
  const [selectedDebt, setSelectedDebt] = useState<Debt>(debts[0]);

  // Simulation calculations
  const amortCentavos = Math.round((parseFloat(amortizeAmount) || 0) * 100);
  const currentSaldo = selectedDebt ? selectedDebt.saldoDevedorCentavos : 0;
  const newSaldo = Math.max(0, currentSaldo - amortCentavos);
  const monthlyRate = (selectedDebt?.taxaJurosMensalPercentual || 0.8) / 100;

  // Rough estimation of months eliminated or installment reduction
  const parcelasEliminadas = Math.min(
    selectedDebt?.parcelasRestantes || 0,
    Math.round(amortCentavos / (selectedDebt?.valorParcelaCentavos || 1))
  );

  const jurosEconomizadosCentavos = Math.round(
    amortCentavos * monthlyRate * (selectedDebt?.parcelasRestantes || 12) * 0.45
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-rose-600" />
            <span>Gestão de Dívidas & Financiamentos</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Separação estrita de principal (amortização de passivo) e juros (despesa financeira). Simule quitações antecipadas.
          </p>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900 text-right">
          <span className="text-[10px] text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider block">
            Saldo Devedor Total
          </span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(debts.reduce((sum, d) => sum + d.saldoDevedorCentavos, 0))}
          </span>
        </div>
      </div>

      {/* Debts Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {debts.map((debt) => (
          <div
            key={debt.id}
            onClick={() => setSelectedDebt(debt)}
            className={`p-6 rounded-2xl border transition cursor-pointer ${
              selectedDebt?.id === debt.id
                ? 'bg-white dark:bg-slate-800 border-rose-500 shadow-md ring-1 ring-rose-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {debt.tipo.replace('_', ' ')}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {debt.credor}
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                {debt.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl text-xs mb-3">
              <div>
                <span className="text-slate-400 text-[10px] block">Principal Contratado:</span>
                <span className="font-semibold">{formatCurrency(debt.principalContratadoCentavos)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Saldo Devedor Atual:</span>
                <span className="font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(debt.saldoDevedorCentavos)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Taxa de Juros:</span>
                <span className="font-bold">{debt.taxaJurosMensalPercentual}% a.m.</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Parcelas Restantes:</span>
                <span className="font-bold">{debt.parcelasRestantes} de {debt.parcelasTotais}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-slate-500">Próximo Vencimento:</span>
              <span className="font-bold">{formatDateBR(debt.proximoVencimento)} ({formatCurrency(debt.valorParcelaCentavos)})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Amortization Simulator */}
      {selectedDebt && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Simulador de Amortização Extraordinária — {selectedDebt.credor}
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Simule o impacto de um aporte extraordinário abatendo diretamente o principal devedor.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Valor do Aporte Extraordinário (R$):
              </label>
              <input
                type="number"
                value={amortizeAmount}
                onChange={(e) => setAmortizeAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
              <span className="text-emerald-800 dark:text-emerald-300 block text-[10px] uppercase font-bold">
                Estimativa de Juros Economizados
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                ~ {formatCurrency(jurosEconomizadosCentavos)}
              </span>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800 text-xs">
              <span className="text-blue-800 dark:text-blue-300 block text-[10px] uppercase font-bold">
                Redução de Prazo Estimada
              </span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400">
                ~ {parcelasEliminadas} meses a menos
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
