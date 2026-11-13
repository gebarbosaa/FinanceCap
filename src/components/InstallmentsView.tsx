import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Zap, Plus, X, CalendarDays, CreditCard as CardIcon } from 'lucide-react';
import { InstallmentPlan, CreditCard, Account, Category } from '../types/finance';
import { formatCurrency, formatDateBR, getCurrentDateISO, parseToCentavos, addMonthsToCompetencia, formatCompetencia } from '../services/currency';

interface InstallmentsViewProps {
  installments: InstallmentPlan[];
  cards: CreditCard[];
  accounts: Account[];
  categories: Category[];
  onAddInstallment: (plan: Omit<InstallmentPlan, 'id'>, categoryId: string) => void;
}

const getInvoiceCompetence = (purchaseDate: string, closingDay: number): string => {
  const [year, month, day] = purchaseDate.split('-').map(Number);
  const purchaseCompetence = `${year}-${String(month).padStart(2, '0')}`;
  return day > closingDay ? addMonthsToCompetencia(purchaseCompetence, 1) : purchaseCompetence;
};

export const InstallmentsView: React.FC<InstallmentsViewProps> = ({
  installments,
  cards,
  accounts,
  categories,
  onAddInstallment,
}) => {
  const [anticipationPlan, setAnticipationPlan] = useState<InstallmentPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [dataCompra, setDataCompra] = useState(getCurrentDateISO());
  const [cartaoId, setCartaoId] = useState(cards.find((card) => card.ativo)?.id || '');
  const [categoriaId, setCategoriaId] = useState(categories.find((category) => category.ativo !== false && category.tipo === 'DESPESA')?.id || '');
  const [totalParcelas, setTotalParcelas] = useState('2');
  const [primeiraCompetencia, setPrimeiraCompetencia] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeCards = useMemo(() => cards.filter((card) => card.ativo), [cards]);
  const expenseCategories = useMemo(() => categories.filter((category) => category.ativo !== false && category.tipo === 'DESPESA'), [categories]);
  const selectedCard = activeCards.find((card) => card.id === cartaoId);

  useEffect(() => {
    if (!selectedCard || !dataCompra) return;
    setPrimeiraCompetencia(getInvoiceCompetence(dataCompra, selectedCard.diaFechamento));
  }, [cartaoId, dataCompra, selectedCard?.diaFechamento]);

  const totalCommittedFuture = installments.reduce((sum, item) => sum + item.saldoRestanteCentavos, 0);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const totalCentavos = parseToCentavos(valorTotal);
    const count = Number(totalParcelas);

    if (!descricao.trim()) return setError('Informe a descrição da compra.');
    if (!Number.isSafeInteger(totalCentavos) || totalCentavos <= 0) return setError('Informe um valor total válido.');
    if (!dataCompra || !/^\d{4}-\d{2}-\d{2}$/.test(dataCompra)) return setError('Informe uma data de compra válida.');
    if (!selectedCard) return setError('Cadastre e selecione um cartão ativo.');
    if (!expenseCategories.some((category) => category.id === categoriaId)) return setError('Selecione uma categoria de despesa ativa.');
    if (!Number.isInteger(count) || count < 2 || count > 48) return setError('A quantidade deve ser de 2 a 48 parcelas.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(primeiraCompetencia)) return setError('Informe a primeira competência da fatura.');

    const defaultCompetence = getInvoiceCompetence(dataCompra, selectedCard.diaFechamento);
    if (primeiraCompetencia < defaultCompetence) return setError(`A primeira fatura não pode ser anterior à competência calculada (${formatCompetencia(defaultCompetence)}).`);

    const baseAmount = Math.floor(totalCentavos / count);
    const remainder = totalCentavos % count;
    if (baseAmount <= 0) return setError('O valor é muito baixo para a quantidade de parcelas escolhida.');

    setSaving(true);
    try {
      onAddInstallment({
        descricao: descricao.trim(),
        valorTotalCentavos: totalCentavos,
        totalParcelas: count,
        valorParcelaCentavos: baseAmount,
        dataCompra,
        primeiraCompetencia,
        cartaoId: selectedCard.id,
        parcelasPagas: 0,
        parcelasFuturas: count,
        saldoRestanteCentavos: totalCentavos,
      }, categoriaId);
      setDescricao('');
      setValorTotal('');
      setTotalParcelas('2');
      setDataCompra(getCurrentDateISO());
      setShowForm(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível cadastrar o parcelamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-orange-500" />
            <span>Controle de Compras Parceladas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cadastre uma compra uma única vez e distribua suas parcelas nas faturas corretas (até 48 parcelas).</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-xl border border-orange-200 dark:border-orange-900/60 text-right">
            <span className="text-[10px] text-orange-800 dark:text-orange-300 font-bold uppercase tracking-wider block">Saldo em parcelas futuras</span>
            <span className="text-lg font-black text-orange-900 dark:text-orange-200">{formatCurrency(totalCommittedFuture)}</span>
          </div>
          <button type="button" onClick={() => { setError(''); setShowForm((value) => !value); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-bold text-white hover:bg-orange-600">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Fechar' : 'Nova compra parcelada'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-white dark:bg-slate-800 p-5 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Cadastrar compra parcelada</h3>
            <p className="text-xs text-slate-500 mt-1">O valor total será dividido em parcelas, com ajuste automático dos centavos restantes.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-xs font-semibold sm:col-span-2">Descrição da compra
              <input required value={descricao} onChange={(event) => setDescricao(event.target.value)} maxLength={100} placeholder="Ex.: Notebook" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold">Valor total (R$)
              <input required value={valorTotal} onChange={(event) => setValorTotal(event.target.value)} inputMode="decimal" placeholder="0,00" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold">Data da compra
              <input required type="date" value={dataCompra} onChange={(event) => setDataCompra(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold">Cartão de crédito
              <select required value={cartaoId} onChange={(event) => setCartaoId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {activeCards.map((card) => <option key={card.id} value={card.id}>{card.nome} • fecha dia {card.diaFechamento}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">Categoria
              <select required value={categoriaId} onChange={(event) => setCategoriaId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">Quantidade de parcelas
              <select value={totalParcelas} onChange={(event) => setTotalParcelas(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm">
                {Array.from({ length: 47 }, (_, index) => index + 2).map((count) => <option key={count} value={count}>{count}x</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">Primeira fatura (competência)
              <input required type="month" value={primeiraCompetencia} onChange={(event) => setPrimeiraCompetencia(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
          </div>
          {selectedCard && primeiraCompetencia && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <CalendarDays className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <span>Cartão fecha dia {selectedCard.diaFechamento}. Pela data da compra, a competência sugerida é <strong>{formatCompetencia(getInvoiceCompetence(dataCompra, selectedCard.diaFechamento))}</strong>. Primeira fatura selecionada: <strong>{formatCompetencia(primeiraCompetencia)}</strong>.</span>
            </div>
          )}
          {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold">Cancelar</button>
            <button type="submit" disabled={saving || activeCards.length === 0 || expenseCategories.length === 0} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50">{saving ? 'Salvando...' : 'Cadastrar e gerar parcelas'}</button>
          </div>
        </form>
      )}

      {installments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">Nenhuma compra parcelada cadastrada. Use “Nova compra parcelada” para começar.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {installments.map((plan) => {
            const card = plan.cartaoId ? cards.find((item) => item.id === plan.cartaoId) : undefined;
            const progressPct = plan.totalParcelas > 0 ? Math.min(100, (plan.parcelasPagas / plan.totalParcelas) * 100) : 0;
            return (
              <div key={plan.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{plan.descricao}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 whitespace-nowrap">{plan.parcelasPagas} / {plan.totalParcelas} pagas</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-2 mb-4"><CardIcon className="w-3.5 h-3.5" /><span>{card?.nome || 'Cartão não disponível'}</span><span>•</span><span>Compra em {formatDateBR(plan.dataCompra)}</span></div>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Progresso de quitação</span><span className="font-bold text-slate-900 dark:text-white">{progressPct.toFixed(0)}%</span></div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden"><div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl text-xs">
                    <div><span className="text-slate-400 block text-[10px]">Valor total</span><span className="font-bold">{formatCurrency(plan.valorTotalCentavos)}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">Parcela base</span><span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(plan.valorParcelaCentavos)}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">Saldo restante</span><span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(plan.saldoRestanteCentavos)}</span></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Primeira fatura: {formatCompetencia(plan.primeiraCompetencia)} • {plan.parcelasFuturas} parcelas futuras</p>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end items-center">
                  <button onClick={() => setAnticipationPlan(plan)} className="flex items-center space-x-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"><Zap className="w-3.5 h-3.5" /><span>Simular antecipação</span></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {anticipationPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3"><h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center space-x-2"><Zap className="w-5 h-5 text-orange-500" /><span>Simulador de antecipação</span></h3><button onClick={() => setAnticipationPlan(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button></div>
            <p className="text-xs text-slate-600 dark:text-slate-300">Antecipação de <strong>{anticipationPlan.descricao}</strong>. Esta tela é apenas uma simulação: não altera faturas, saldo ou limite do cartão.</p>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between"><span>Parcelas restantes</span><span className="font-bold">{anticipationPlan.parcelasFuturas}</span></div>
              <div className="flex justify-between"><span>Valor por parcela</span><span className="font-bold">{formatCurrency(anticipationPlan.valorParcelaCentavos)}</span></div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-700"><span>Saldo para quitação</span><span className="text-orange-600">{formatCurrency(anticipationPlan.saldoRestanteCentavos)}</span></div>
            </div>
            <button onClick={() => setAnticipationPlan(null)} className="w-full py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition">Fechar simulação</button>
          </div>
        </div>
      )}
    </div>
  );
};
