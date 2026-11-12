import React, { useState } from 'react';
import { Calculator, ArrowRight, Check, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '../services/currency';

export const SimulatorView: React.FC = () => {
  const [purchaseAmount, setPurchaseAmount] = useState<string>('5000');
  const [discountPercent, setDiscountPercent] = useState<string>('8');
  const [installmentsCount, setInstallmentsCount] = useState<number>(10);
  const [cdiAnnualRate, setCdiAnnualRate] = useState<string>('12.75');

  // Calculations for À Vista vs Parcelado
  const totalOriginal = parseFloat(purchaseAmount) || 0;
  const discountPct = parseFloat(discountPercent) || 0;
  const cdiPct = parseFloat(cdiAnnualRate) || 12.75;

  const aVistaPrice = totalOriginal * (1 - discountPct / 100);
  const installmentValue = installmentsCount > 0 ? totalOriginal / installmentsCount : 0;

  // Monthly yield on cash kept in 100% CDI
  const monthlyYieldRate = Math.pow(1 + cdiPct / 100, 1 / 12) - 1;

  // Simulate keeping (aVistaPrice) in CDI and paying installments monthly
  let simulatedBalance = totalOriginal;
  let totalYieldEarned = 0;
  for (let i = 0; i < installmentsCount; i++) {
    const yieldEarned = simulatedBalance * monthlyYieldRate;
    totalYieldEarned += yieldEarned;
    simulatedBalance = simulatedBalance + yieldEarned - installmentValue;
  }

  const netSavingsIfAVista = totalOriginal - aVistaPrice - totalYieldEarned;
  const isAVistaBetter = netSavingsIfAVista > 0;

  // Scenario Simulator
  const [scenarioType, setScenarioType] = useState<'OTIMISTA' | 'CONSERVADOR' | 'PESSIMISTA'>('CONSERVADOR');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <span>Simulador Financeiro de Decisão</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare compras à vista com desconto versus parceladas no cartão. Simulações nunca alteram a base de dados real.
          </p>
        </div>
      </div>

      {/* Simulator 1: À Vista vs Parcelado */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
          1. Comparador: Comprar À Vista (com Desconto) vs Parcelar no Cartão
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Valor da Compra (R$):
            </label>
            <input
              type="number"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Desconto À Vista (%):
            </label>
            <input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nº de Parcelas Sem Juros:
            </label>
            <input
              type="number"
              value={installmentsCount}
              min={1}
              max={48}
              onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 1)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Taxa Selic/CDI Anual (%):
            </label>
            <input
              type="number"
              value={cdiAnnualRate}
              onChange={(e) => setCdiAnnualRate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Comparison Result Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Cenário À Vista */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              isAVistaBetter
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500'
                : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Opção A: Pagar À Vista com Desconto
              </h4>
              {isAVistaBetter && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Mais Vantajosa
                </span>
              )}
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {formatCurrency(Math.round(aVistaPrice * 100))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Economia imediata de {formatCurrency(Math.round((totalOriginal - aVistaPrice) * 100))} ({discountPct}%).
            </p>
          </div>

          {/* Cenário Parcelado */}
          <div
            className={`p-5 rounded-2xl border space-y-2 ${
              !isAVistaBetter
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500'
                : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Opção B: Parcelar em {installmentsCount}x de {formatCurrency(Math.round(installmentValue * 100))}
              </h4>
              {!isAVistaBetter && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Mais Vantajosa
                </span>
              )}
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {formatCurrency(Math.round(totalOriginal * 100))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Rendimento estimado deixando o dinheiro no CDI: +{formatCurrency(Math.round(totalYieldEarned * 100))}.
            </p>
          </div>
        </div>

        {/* Conclusion Pill */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>
            <strong>Veredito Barbosa Fernandes: </strong>
            {isAVistaBetter
              ? `O desconto à vista supera o rendimento do CDI no período. Vale a pena pagar à vista e economizar ${formatCurrency(Math.round(netSavingsIfAVista * 100))} líquidos.`
              : `O desconto à vista é pequeno. Vale a pena parcelar no cartão sem juros e manter o capital rendendo 100% do CDI.`}
          </span>
        </div>
      </div>

      {/* Scenario Planner */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
          2. Cenários de Planejamento de 12 Meses (Simulação Segura)
        </h3>

        <div className="flex space-x-2">
          {(['CONSERVADOR', 'OTIMISTA', 'PESSIMISTA'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScenarioType(s)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                scenarioType === s
                  ? 'bg-[#0B2545] text-white border-transparent'
                  : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
              }`}
            >
              Cenário {s}
            </button>
          ))}
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl text-xs space-y-2">
          {scenarioType === 'CONSERVADOR' && (
            <p>
              <strong>Cenário Conservador:</strong> Mantém a renda fixa prevista (R$ 25.000,00/mês) e inflaciona as despesas variáveis em 5% a.a. Projeta liquidez estável com poupança média mensal de R$ 9.500,00.
            </p>
          )}
          {scenarioType === 'OTIMISTA' && (
            <p>
              <strong>Cenário Otimista:</strong> Considera bônus e distribuição de lucros semestral de R$ 40.000,00 e controle de despesas no teto. Projeta quitação antecipada de 30 parcelas do financiamento imobiliário.
            </p>
          )}
          {scenarioType === 'PESSIMISTA' && (
            <p>
              <strong>Cenário Pessimista:</strong> Simula redução de 20% na receita extraordinária e surgimento de 2 imprevistos de saúde/veículo. A Reserva de Emergência garante cobertura sem contração de novas dívidas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
