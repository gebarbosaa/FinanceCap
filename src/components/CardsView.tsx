import React, { useState } from 'react';
import {
  CreditCard as CardIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  Coins,
  ShieldCheck,
  Calendar,
  Lock,
  ArrowRight,
} from 'lucide-react';
import {
  CreditCard,
  Invoice,
  Account,
  Transaction,
  InstallmentPlan,
  Category,
} from '../types/finance';
import { formatCurrency, formatDateBR, parseToCentavos } from '../services/currency';
import { calculateCardLimits } from '../services/financeEngine';

interface CardsViewProps {
  cards: CreditCard[];
  categories: Category[];
  invoices: Invoice[];
  accounts: Account[];
  transactions: Transaction[];
  installments: InstallmentPlan[];
  onPayInvoice: (invoiceId: string, contaId: string, valorCentavos: number) => { success: boolean; message: string };
  onAddCard: (card: Omit<CreditCard, 'id'>) => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  cards,
  categories,
  invoices,
  accounts,
  transactions,
  installments,
  onPayInvoice,
  onAddCard,
}) => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || '');
  const [payAmountType, setPayAmountType] = useState<'INTEGRAL' | 'PARCIAL'>('INTEGRAL');
  const [customPayAmount, setCustomPayAmount] = useState('');

  const handleConfirmPayment = () => {
    if (!selectedInvoice) return;
    const amountToPay =
      payAmountType === 'INTEGRAL'
        ? selectedInvoice.saldoRestanteCentavos
        : parseToCentavos(customPayAmount);

    if (!Number.isSafeInteger(amountToPay) || amountToPay <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    if (amountToPay > selectedInvoice.saldoRestanteCentavos) {
      alert('O valor de pagamento não pode superar o saldo restante da fatura.');
      return;
    }

    if (!payAccountId || !accounts.some((account) => account.id === payAccountId && account.ativo)) {
      alert('Selecione uma conta bancária ativa para realizar o pagamento.');
      return;
    }

    const result = onPayInvoice(selectedInvoice.id, payAccountId, amountToPay);
    if (!result.success) {
      alert(result.message);
      return;
    }
    setSelectedInvoice(null);
    setCustomPayAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Cards Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <CardIcon className="w-5 h-5 text-blue-600" />
            <span>Gestão de Cartões de Crédito & Faturas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle de limites, parcelas futuras comprometidas e liquidação de faturas sem duplicar despesas.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Regra de Ouro: Pagamento de fatura não gera nova despesa</span>
        </div>
      </div>

      {/* Credit Cards Visual Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const limits = calculateCardLimits(card, transactions, installments, invoices);
          const pct = limits.limiteTotalCentavos > 0
            ? (limits.limiteUtilizadoCentavos / limits.limiteTotalCentavos) * 100
            : 0;
          const openInvoices = invoices.filter((i) => i.cartaoId === card.id && i.status !== 'PAGA');

          return (
            <div
              key={card.id}
              className="bg-gradient-to-br from-[#0B2545] to-[#1F4E79] text-white p-6 rounded-2xl shadow-xl border border-blue-900/60 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none"></div>

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      {card.instituicao} • {card.bandeira}
                    </span>
                    <h3 className="text-lg font-black tracking-tight">{card.nome}</h3>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-white/10 rounded-lg backdrop-blur">
                    {card.ativo ? 'ATIVO' : 'BLOQUEADO'}
                  </span>
                </div>

                {/* Limits Breakdown */}
                <div className="space-y-2 mt-4 bg-black/20 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-200">Limite Total:</span>
                    <span className="font-bold">{formatCurrency(limits.limiteTotalCentavos)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-300">Limite Utilizado:</span>
                    <span className="font-bold text-amber-300">
                      {formatCurrency(limits.limiteUtilizadoCentavos)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-white/10">
                    <span className="text-emerald-300 font-bold">Limite Disponível:</span>
                    <span className="font-black text-emerald-300">
                      {formatCurrency(limits.limiteDisponivelCentavos)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct > 80 ? 'bg-rose-400' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Cycle Info */}
              <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/10 text-xs text-blue-200">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Fecha dia {card.diaFechamento}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-amber-300 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Vence dia {card.diaVencimento}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices by Card and Competence */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
          Faturas Registradas por Competência
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Cartão</th>
                <th className="py-3 px-4">Competência</th>
                <th className="py-3 px-4">Fechamento</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-right">Valor Pago</th>
                <th className="py-3 px-4 text-right">Saldo Restante</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
              {invoices.map((inv) => {
                const card = cards.find((c) => c.id === inv.cartaoId);
                const isPaid = inv.status === 'PAGA';

                return (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {card?.nome || 'Cartão'}
                    </td>
                    <td className="py-3 px-4 font-mono">{inv.competencia}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateBR(inv.dataFechamento)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {formatDateBR(inv.dataVencimento)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(inv.valorTotalCentavos)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      {formatCurrency(inv.valorPagoCentavos)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(inv.saldoRestanteCentavos)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : inv.status === 'PARCIALMENTE_PAGA'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id)}
                          className="text-orange-600 dark:text-orange-400 font-bold hover:underline"
                          aria-expanded={expandedInvoiceId === inv.id}
                        >
                          {expandedInvoiceId === inv.id ? 'Ocultar lançamentos' : 'Ver lançamentos'}
                        </button>
                        {!isPaid && (
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
                          >
                            Pagar Fatura
                          </button>
                        )}
                        {isPaid && (
                          <span className="flex items-center justify-center space-x-1 text-emerald-600 text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Quitada</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedInvoiceId === inv.id && (
                    <tr key={`${inv.id}-transactions`} className="bg-orange-50/50 dark:bg-slate-900/60">
                      <td colSpan={9} className="px-4 py-4">
                        {(() => {
                          const invoiceTransactions = transactions
                            .filter((tx) => {
                              if (tx.isDeleted || tx.cartaoId !== inv.cartaoId || tx.tipo !== 'DESPESA' || tx.status === 'CANCELADO' || tx.status === 'ESTORNADO') return false;
                              if (tx.faturaId) return tx.faturaId === inv.id;
                              return tx.competencia === inv.competencia;
                            })
                            .sort((a, b) => a.data.localeCompare(b.data));
                          return (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                  Lançamentos da fatura • {card?.nome || 'Cartão'} • {inv.competencia}
                                </h4>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                  {invoiceTransactions.length} {invoiceTransactions.length === 1 ? 'lançamento' : 'lançamentos'} • {formatCurrency(invoiceTransactions.reduce((sum, tx) => sum + tx.valorCentavos, 0))}
                                </span>
                              </div>
                              {invoiceTransactions.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400">
                                  Nenhum lançamento encontrado para esta fatura. Compras sem vínculo direto são agrupadas pela competência.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-white dark:bg-slate-800 text-slate-500">
                                      <tr>
                                        <th className="px-3 py-2">Data</th>
                                        <th className="px-3 py-2">Descrição</th>
                                        <th className="px-3 py-2">Categoria</th>
                                        <th className="px-3 py-2">Parcela</th>
                                        <th className="px-3 py-2 text-right">Valor</th>
                                        <th className="px-3 py-2">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                      {invoiceTransactions.map((tx) => (
                                        <tr key={tx.id} className="text-slate-700 dark:text-slate-200">
                                          <td className="px-3 py-2 whitespace-nowrap">{formatDateBR(tx.data)}</td>
                                          <td className="px-3 py-2 font-semibold">{tx.descricao}</td>
                                          <td className="px-3 py-2">{categories.find((category) => category.id === tx.categoriaId)?.nome || 'Sem categoria'}</td>
                                          <td className="px-3 py-2">{tx.parcelaNumero && tx.totalParcelas ? `${tx.parcelaNumero}/${tx.totalParcelas}` : '—'}</td>
                                          <td className="px-3 py-2 text-right font-bold whitespace-nowrap">{formatCurrency(tx.valorCentavos)}</td>
                                          <td className="px-3 py-2">{tx.status}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  )}
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>Liquidar Fatura de Cartão</span>
              </h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Cartão:</span>
                <span className="font-bold">
                  {cards.find((c) => c.id === selectedInvoice.cartaoId)?.nome}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Competência da Fatura:</span>
                <span className="font-mono">{selectedInvoice.competencia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data de Vencimento:</span>
                <span>{formatDateBR(selectedInvoice.dataVencimento)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Saldo Devedor Restante:</span>
                <span className="text-rose-600">
                  {formatCurrency(selectedInvoice.saldoRestanteCentavos)}
                </span>
              </div>
            </div>

            {/* Select Bank Account */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Conta Bancária de Saída (Débito):
              </label>
              <select
                value={payAccountId}
                onChange={(e) => setPayAccountId(e.target.value)}
                aria-label="Conta bancária para pagamento da fatura"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              >
                {accounts
                  .filter((a) => a.ativo)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome} ({acc.instituicao})
                    </option>
                  ))}
              </select>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Modalidade de Pagamento:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayAmountType('INTEGRAL')}
                  className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                    payAmountType === 'INTEGRAL'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Integral ({formatCurrency(selectedInvoice.saldoRestanteCentavos)})
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmountType('PARCIAL')}
                  className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                    payAmountType === 'PARCIAL'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Parcial
                </button>
              </div>
            </div>

            {payAmountType === 'PARCIAL' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valor a Pagar (R$):
                </label>
                <input
                  type="text"
                  placeholder="Ex: 500,00"
                  value={customPayAmount}
                  onChange={(e) => setCustomPayAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-300">
              ✓ Esta operação registra a liquidação contábil da fatura e debita a conta bancária sem criar despesa duplicada.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                Confirmar Liquidação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
