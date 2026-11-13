import React, { useState } from 'react';
import { Landmark, AlertCircle, Calculator, TrendingDown, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { Account, Category, Debt } from '../types/finance';
import { formatCurrency, formatDateBR, parseToCentavos } from '../services/currency';

interface DebtsViewProps {
  debts: Debt[];
  accounts: Account[];
  categories: Category[];
  onApplyDebtPayment: (args: { debtId: string; accountId: string; principalCentavos: number; interestCentavos: number; interestCategoryId: string; date: string; paymentId: string }) => void;
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
  onUpdateDebt: (id: string, updates: Partial<Omit<Debt, 'id'>>) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({ debts, accounts, categories, onAddDebt, onUpdateDebt, onApplyDebtPayment }) => {
  const [amortizeAmount, setAmortizeAmount] = useState<string>('20000');
  const [selectedDebt, setSelectedDebt] = useState<Debt | undefined>(debts[0]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ credor: '', tipo: 'EMPRESTIMO_PESSOAL' as Debt['tipo'], principal: '', saldo: '', juros: '0', parcelasTotais: '1', parcelasRestantes: '1', valorParcela: '', proximoVencimento: new Date().toISOString().slice(0, 10) });
  const submitDebt = (event: React.FormEvent) => {
    event.preventDefault();
    const principal = parseToCentavos(form.principal);
    const saldo = parseToCentavos(form.saldo || form.principal);
    const parcela = parseToCentavos(form.valorParcela);
    const total = Number(form.parcelasTotais);
    const restantes = Number(form.parcelasRestantes);
    const juros = Number(form.juros);
    if (!form.credor.trim() || principal <= 0 || saldo < 0 || parcela <= 0 || !Number.isInteger(total) || total < 1 || !Number.isInteger(restantes) || restantes < 0 || restantes > total || !Number.isFinite(juros) || juros < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(form.proximoVencimento)) {
      window.alert('Revise os dados da dívida.'); return;
    }
    onAddDebt({ credor: form.credor.trim(), tipo: form.tipo, principalContratadoCentavos: principal, saldoDevedorCentavos: saldo, taxaJurosMensalPercentual: juros, parcelasTotais: total, parcelasRestantes: restantes, valorParcelaCentavos: parcela, proximoVencimento: form.proximoVencimento, status: saldo === 0 ? 'QUITADO' : 'EM_DIA' });
    setShowForm(false);
  };

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

      <div className="flex justify-end"><button type="button" onClick={() => setShowForm(v => !v)} className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white">{showForm ? 'Fechar' : 'Adicionar dívida'}</button></div>
      {showForm && <form onSubmit={submitDebt} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-xs font-semibold">Credor<input required value={form.credor} onChange={e => setForm({...form,credor:e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700" /></label>
        <label className="text-xs font-semibold">Tipo<select value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value as Debt['tipo']})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700"><option value="EMPRESTIMO_PESSOAL">Empréstimo pessoal</option><option value="FINANCIAMENTO_IMOBILIARIO">Financiamento imobiliário</option><option value="FINANCIAMENTO_VEICULO">Financiamento de veículo</option><option value="CONSIGNADO">Consignado</option><option value="DIVIDA_PESSOAL">Dívida pessoal</option><option value="OUTRO">Outro</option></select></label>
        <label className="text-xs font-semibold">Principal (R$)<input required value={form.principal} onChange={e => setForm({...form,principal:e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700" /></label>
        <label className="text-xs font-semibold">Saldo devedor (R$)<input value={form.saldo} onChange={e => setForm({...form,saldo:e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700" placeholder="Igual ao principal" /></label>
        <label className="text-xs font-semibold">Juros ao mês (%)<input type="number" min="0" step="0.01" value={form.juros} onChange={e => setForm({...form,juros:e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700" /></label>
        <label className="text-xs font-semibold">Parcela (R$)<input required value={form.valorParcela} onChange={e => setForm({...form,valorParcela:e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700" /></label>
        <label className="text-xs font-semibold">Total de parcelas<input type="number" min="1" value={form.parcelasTotais} onChange={e => setForm({...form,parcelasTotais:e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700" /></label>
        <label className="text-xs font-semibold">Restantes<input type="number" min="0" value={form.parcelasRestantes} onChange={e => setForm({...form,parcelasRestantes:e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700" /></label>
        <label className="text-xs font-semibold">Próximo vencimento<input type="date" required value={form.proximoVencimento} onChange={e => setForm({...form,proximoVencimento:e.target.value})} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-700" /></label>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end"><button type="submit" className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white">Salvar dívida</button></div>
      </form>}
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">{debt.status}</span>
                <button type="button" onClick={(event) => {
                  event.stopPropagation();
                  const creditor = window.prompt('Credor:', debt.credor);
                  if (creditor === null || !creditor.trim()) return;
                  const balanceText = window.prompt('Saldo devedor atual (R$):', (debt.saldoDevedorCentavos / 100).toFixed(2).replace('.', ','));
                  if (balanceText === null) return;
                  const balance = parseToCentavos(balanceText);
                  if (!Number.isSafeInteger(balance) || balance < 0 || balance > debt.principalContratadoCentavos) { window.alert('Saldo inválido.'); return; }
                  onUpdateDebt(debt.id, { credor: creditor.trim(), saldoDevedorCentavos: balance, status: balance === 0 ? 'QUITADO' : 'EM_DIA' });
                }} className="rounded-md border px-2 py-1 text-[10px] font-bold text-orange-600">Editar</button>
              </div>
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

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!accounts.some(account => account.ativo)} onClick={() => {
              if (!selectedDebt) return;
              const accountOptions = accounts.filter(account => account.ativo);
              const accountText = accountOptions.map((item,index) => `${index + 1}. ${item.nome}`).join('\n');
              const accountIndex = Number(window.prompt(`Conta de saída:\n${accountText}`, '1')) - 1;
              const account = accountOptions[accountIndex];
              if (!account) return;
              const principal = parseToCentavos(window.prompt('Valor amortizado do principal (R$):') || '');
              const interest = parseToCentavos(window.prompt('Juros pagos neste pagamento (R$):', '0') || '0');
              const expenseCategories = categories.filter(item => item.tipo === 'DESPESA' && item.ativo !== false);
              const categoryText = expenseCategories.map((item,index) => `${index + 1}. ${item.nome}`).join('\n');
              const categoryIndex = interest > 0 ? Number(window.prompt(`Categoria dos juros:\n${categoryText}`, '1')) - 1 : 0;
              const category = expenseCategories[categoryIndex];
              if (!Number.isSafeInteger(principal) || principal <= 0 || !Number.isSafeInteger(interest) || interest < 0 || (interest > 0 && !category)) { window.alert('Revise os valores e a categoria dos juros.'); return; }
              onApplyDebtPayment({ debtId: selectedDebt.id, accountId: account.id, principalCentavos: principal, interestCentavos: interest, interestCategoryId: category?.id || '', date: new Date().toISOString().slice(0, 10), paymentId: `debtpay-${Date.now()}` });
            }} className="rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Registrar amortização real</button>
            <p className="self-center text-[11px] text-slate-500">O principal reduz a dívida sem entrar como despesa; os juros são lançados como despesa financeira.</p>
          </div>
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
