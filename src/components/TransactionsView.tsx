import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  RotateCcw,
  CheckCircle,
  Clock,
  Ban,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Transaction,
  Category,
  Account,
  CreditCard,
  TransactionType,
  TransactionStatus,
} from '../types/finance';
import { formatCurrency, formatDateBR, parseToCentavos } from '../services/currency';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  currentCompetencia: string;
  onAddTransaction: () => void;
  onDeleteTransaction: (txId: string, reason: string) => void;
  onSaveEdit: (txId: string, updates: Partial<Transaction>) => void;
  invoices: import('../types/finance').Invoice[];
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  accounts,
  cards,
  currentCompetencia,
  onAddTransaction,
  onDeleteTransaction,
  onSaveEdit,
  invoices,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterAccount, setFilterAccount] = useState<string>('TODAS');
  const [deleteModalTx, setDeleteModalTx] = useState<Transaction | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editDestinationAccount, setEditDestinationAccount] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState<TransactionStatus>('REALIZADO');
  const [editNotes, setEditNotes] = useState('');

  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const accMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));
  const cardMap = new Map<string, CreditCard>(cards.map((c) => [c.id, c]));

  // Filtering
  const filtered = transactions.filter((t) => {
    if (t.isDeleted) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchDesc = t.descricao.toLowerCase().includes(q);
      const matchCat = (catMap.get(t.categoriaId)?.nome || '').toLowerCase().includes(q);
      if (!matchDesc && !matchCat) return false;
    }

    if (filterType !== 'TODOS' && t.tipo !== filterType) return false;
    if (filterStatus !== 'TODOS' && t.status !== filterStatus) return false;
    if (filterCategory !== 'TODAS' && t.categoriaId !== filterCategory) return false;
    if (filterAccount !== 'TODAS') {
      if (t.contaId !== filterAccount && t.cartaoId !== filterAccount) return false;
    }

    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = 'ID;Data;Competência;Descrição;Tipo;Categoria;Conta/Cartão;Forma Pagamento;Valor (R$);Status;Origem\n';
    const rows = filtered
      .map((t) => {
        const cat = catMap.get(t.categoriaId)?.nome || '';
        const acc = t.contaId ? accMap.get(t.contaId)?.nome : cardMap.get(t.cartaoId || '')?.nome;
        return `${t.id};${formatDateBR(t.data)};${t.competencia};"${t.descricao}";${t.tipo};"${cat}";"${acc || ''}";"${t.formaPagamento}";${(t.valorCentavos / 100).toFixed(2)};${t.status};${t.origem}`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lancamentos_BF_${currentCompetencia}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEdit = (tx: Transaction) => {
    if (tx.parcelamentoId || tx.tipo === 'LIQUIDACAO') {
      alert('Esta movimentação é gerenciada pelo parcelamento ou pela fatura de origem.');
      return;
    }
    setEditTx(tx);
    setEditDescription(tx.descricao);
    setEditDate(tx.data);
    setEditSource(tx.cartaoId ? `card:${tx.cartaoId}` : `account:${tx.contaId || accounts.find((account) => account.ativo)?.id || ''}`);
    setEditDestinationAccount(tx.contaDestinoId || accounts.find((account) => account.ativo && account.id !== tx.contaId)?.id || '');
    setEditAmount((tx.valorCentavos / 100).toFixed(2).replace('.', ','));
    setEditCategory(tx.categoriaId);
    setEditStatus(tx.status);
    setEditNotes(tx.observacoes || '');
  };

  const submitEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTx) return;
    const amount = parseToCentavos(editAmount);
    if (!editDescription.trim() || !Number.isSafeInteger(amount) || amount <= 0) {
      alert('Informe uma descrição e um valor válido.');
      return;
    }
    try {
      if (!editDate) throw new Error('Informe a data do lançamento.');
      const updates: Partial<Transaction> = {
        data: editDate,
        competencia: editDate.slice(0, 7),
        descricao: editDescription.trim(),
        valorCentavos: amount,
        categoriaId: editCategory,
        status: editStatus,
        observacoes: editNotes.trim() || undefined,
      };
      if (editTx.tipo === 'TRANSFERENCIA') {
        if (!editSource.startsWith('account:') || !editDestinationAccount || editSource.slice(8) === editDestinationAccount) {
          throw new Error('Selecione contas de origem e destino diferentes.');
        }
        updates.contaId = editSource.slice(8);
        updates.contaDestinoId = editDestinationAccount;
        updates.cartaoId = undefined;
        updates.faturaId = undefined;
      } else if (editSource.startsWith('card:')) {
        if (editTx.tipo !== 'DESPESA') throw new Error('Receitas não podem ser lançadas em cartão de crédito.');
        updates.cartaoId = editSource.slice(5);
        updates.contaId = undefined;
        updates.contaDestinoId = undefined;
        updates.formaPagamento = 'CARTAO_CREDITO';
      } else {
        updates.contaId = editSource.startsWith('account:') ? editSource.slice(8) : '';
        updates.cartaoId = undefined;
        updates.contaDestinoId = undefined;
      }
      onSaveEdit(editTx.id, updates);
      setEditTx(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível atualizar o lançamento.');
    }
  };

  const confirmDelete = () => {
    if (!deleteModalTx) return;
    if (!deleteReason.trim()) {
      alert('Por favor, informe a justificativa obrigatória para exclusão lógica.');
      return;
    }
    try {
      onDeleteTransaction(deleteModalTx.id, deleteReason);
      setDeleteModalTx(null);
      setDeleteReason('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível excluir o lançamento.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Lançamentos Financeiros
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length} registro(s) encontrado(s) • Precisão contábil em centavos
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onAddTransaction}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filtrar por tipo de movimentação"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="RECEITA">Receita</option>
              <option value="DESPESA">Despesa</option>
              <option value="TRANSFERENCIA">Transferência</option>
              <option value="LIQUIDACAO">Liquidação (Fatura)</option>
              <option value="AMORTIZACAO">Amortização de principal</option>
              <option value="AJUSTE">Ajuste de Saldo</option>
              <option value="ESTORNO">Estorno</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filtrar por status"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="REALIZADO">Realizado</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PREVISTO">Previsto</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              aria-label="Filtrar por categoria"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="TODAS">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.isGranaExtra ? '(Grana Extra)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Account/Card Filter */}
          <div>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              aria-label="Filtrar por conta ou cartão"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="TODAS">Todas as Contas e Cartões</option>
              <optgroup label="Contas Bancárias">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cartões de Crédito">
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4">Descrição</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">Conta / Cartão</th>
                <th className="py-3.5 px-4 text-right">Valor</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Nenhum lançamento corresponde aos filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const cat = catMap.get(tx.categoriaId);
                  const acc = tx.contaId ? accMap.get(tx.contaId) : undefined;
                  const card = tx.cartaoId ? cardMap.get(tx.cartaoId) : undefined;
                  const accDest = tx.contaDestinoId ? accMap.get(tx.contaDestinoId) : undefined;

                  const isIncome = tx.tipo === 'RECEITA';
                  const isExpense = tx.tipo === 'DESPESA';
                  const isTransfer = tx.tipo === 'TRANSFERENCIA';
                  const isLiquidation = tx.tipo === 'LIQUIDACAO';
                  const isAmortization = tx.tipo === 'AMORTIZACAO';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition group"
                    >
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateBR(tx.data)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {tx.descricao}
                        </div>
                        {tx.observacoes && (
                          <div className="text-[10px] text-slate-400 italic">
                            {tx.observacoes}
                          </div>
                        )}
                        {tx.parcelaNumero && tx.totalParcelas && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.2 rounded">
                            Parcela {tx.parcelaNumero}/{tx.totalParcelas}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isIncome
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : isExpense
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : isTransfer
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : isLiquidation || isAmortization
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isIncome && <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                          {isExpense && <ArrowDownRight className="w-3 h-3 text-rose-600" />}
                          {isTransfer && <ArrowLeftRight className="w-3 h-3 text-blue-600" />}
                          <span>{isAmortization ? 'AMORTIZAÇÃO PRINCIPAL' : tx.tipo}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {cat ? (
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${cat.cor}18`,
                              color: cat.cor,
                              border: `1px solid ${cat.cor}30`,
                            }}
                          >
                            {cat.nome}
                            {cat.isGranaExtra && (
                              <span className="ml-1 text-[9px] font-bold uppercase">(Grana Extra)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sem categoria</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {isTransfer ? (
                          <div className="text-[11px] font-medium">
                            <span>{acc?.nome || 'Origem'}</span> →{' '}
                            <span className="font-bold text-blue-600">{accDest?.nome || 'Destino'}</span>
                          </div>
                        ) : card ? (
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            💳 {card.nome}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            🏦 {acc?.nome || 'Conta'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black whitespace-nowrap">
                        <span
                          className={`${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isExpense
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLiquidation
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {isIncome ? '+' : isExpense || isLiquidation ? '-' : ''}
                          {formatCurrency(tx.valorCentavos)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            tx.status === 'REALIZADO'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : tx.status === 'PENDENTE'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : tx.status === 'PREVISTO'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            disabled={tx.tipo === 'AMORTIZACAO' || tx.tipo === 'LIQUIDACAO'}
                            onClick={() => openEdit(tx)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={!!tx.parcelamentoId || tx.tipo === 'LIQUIDACAO' || tx.tipo === 'AMORTIZACAO'}
                            onClick={() => setDeleteModalTx(tx)}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded cursor-pointer transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Excluir logicamente com auditoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitEdit} className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Editar lançamento</h3>
              <button type="button" onClick={() => setEditTx(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-500">Tipo: {editTx.tipo}. Altere a data e a origem; compras no cartão serão realocadas para a fatura correspondente.</p>
            <label className="block text-xs font-bold">Descrição
              <input required maxLength={120} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm" />
            </label>
            <label className="block text-xs font-bold">Data
              <input required type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-bold">Valor (R$)
                <input required value={editAmount} onChange={(event) => setEditAmount(event.target.value)} inputMode="decimal" disabled={!!editTx.faturaId && invoices.some((invoice) => invoice.id === editTx.faturaId && invoice.status === 'PAGA')} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm disabled:opacity-50" />
              </label>
              <label className="block text-xs font-bold">Status
                <select value={editStatus} onChange={(event) => setEditStatus(event.target.value as TransactionStatus)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm">
                  <option value="REALIZADO">Realizado</option><option value="PENDENTE">Pendente</option><option value="PREVISTO">Previsto</option><option value="CANCELADO">Cancelado</option>
                </select>
              </label>
            </div>
            {editTx.tipo !== 'TRANSFERENCIA' && (
              <label className="block text-xs font-bold">Categoria
                <select value={editCategory} onChange={(event) => setEditCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm">
                  {categories.filter((category) => category.tipo === (editTx.tipo === 'RECEITA' ? 'RECEITA' : 'DESPESA')).map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}
                </select>
              </label>
            )}
            {editTx.tipo === 'TRANSFERENCIA' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold">Conta de origem
                  <select required value={editSource} onChange={(event) => setEditSource(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm">
                    {accounts.filter((account) => account.ativo || account.id === editTx.contaId).map((account) => <option key={account.id} value={`account:${account.id}`}>{account.nome}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold">Conta de destino
                  <select required value={editDestinationAccount} onChange={(event) => setEditDestinationAccount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm">
                    {accounts.filter((account) => account.ativo || account.id === editTx.contaDestinoId).map((account) => <option key={account.id} value={account.id}>{account.nome}</option>)}
                  </select>
                </label>
              </div>
            ) : (
              <label className="block text-xs font-bold">Conta / Cartão de origem
                <select required value={editSource} onChange={(event) => setEditSource(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm">
                  <optgroup label="Contas bancárias">
                    {accounts.filter((account) => account.ativo || account.id === editTx.contaId).map((account) => <option key={account.id} value={`account:${account.id}`}>{account.nome}</option>)}
                  </optgroup>
                  {editTx.tipo === 'DESPESA' && <optgroup label="Cartões de crédito">
                    {cards.filter((card) => card.ativo || card.id === editTx.cartaoId).map((card) => <option key={card.id} value={`card:${card.id}`}>{card.nome}</option>)}
                  </optgroup>}
                </select>
              </label>
            )}
            <label className="block text-xs font-bold">Observações
              <textarea rows={2} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-2.5 text-sm" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditTx(null)} className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold">Cancelar</button>
              <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white">Salvar alterações</button>
            </div>
          </form>
        </div>
      )}
      {/* Logical Deletion Modal (MANDATORY REASON) */}
      {deleteModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Exclusão Lógica de Lançamento
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Conforme os princípios Barbosa Fernandes, nenhum lançamento é apagado silenciosamente. O registro será desativado e o motivo será registrado permanentemente no <strong>Log de Auditoria</strong>.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-xs space-y-1">
              <div><strong>Lançamento:</strong> {deleteModalTx.descricao}</div>
              <div><strong>Valor:</strong> {formatCurrency(deleteModalTx.valorCentavos)}</div>
              <div><strong>Data:</strong> {formatDateBR(deleteModalTx.data)}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Motivo Obrigatório da Exclusão:
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Lançamento duplicado no extrato / cancelamento do serviço"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs focus:ring-1 focus:ring-rose-500 text-slate-900 dark:text-white h-20"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteModalTx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                Confirmar Exclusão Lógica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
