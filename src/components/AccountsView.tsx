import React, { useMemo, useState } from 'react';
import { Landmark, Plus, Wallet, Building2 } from 'lucide-react';
import { Account, AccountType } from '../types/finance';
import { formatCurrency, formatDateBR, getCurrentDateISO, parseToCentavos } from '../services/currency';

interface AccountsViewProps {
  accounts: Account[];
  onAddAccount: (account: Omit<Account, 'id'>) => void;
}

const ACCOUNT_TYPES: Array<{ value: AccountType; label: string }> = [
  { value: 'CONTA_CORRENTE', label: 'Conta corrente' },
  { value: 'POUPANCA', label: 'Poupança' },
  { value: 'CARTEIRA_DIGITAL', label: 'Carteira digital' },
  { value: 'DINHEIRO', label: 'Dinheiro / carteira física' },
  { value: 'INVESTIMENTO', label: 'Conta de investimento' },
  { value: 'RESERVA', label: 'Reserva financeira' },
];

export const AccountsView: React.FC<AccountsViewProps> = ({ accounts, onAddAccount }) => {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [tipo, setTipo] = useState<AccountType>('CONTA_CORRENTE');
  const [saldoInicial, setSaldoInicial] = useState('0,00');
  const [dataSaldoInicial, setDataSaldoInicial] = useState(getCurrentDateISO());
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState('');

  const activeAccounts = accounts.filter((account) => account.ativo);
  const totalBalance = useMemo(
    () => activeAccounts.reduce((sum, account) => sum + account.saldoInicialCentavos, 0),
    [activeAccounts]
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = nome.trim();
    const cleanInstitution = instituicao.trim();
    const amount = parseToCentavos(saldoInicial);
    if (!cleanName || !cleanInstitution) {
      setError('Informe o nome da conta e a instituição financeira.');
      return;
    }
    if (!Number.isSafeInteger(amount)) {
      setError('Informe um saldo inicial válido.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataSaldoInicial)) {
      setError('Informe uma data de saldo inicial válida.');
      return;
    }
    try {
      onAddAccount({
        nome: cleanName,
        instituicao: cleanInstitution,
        tipo,
        saldoInicialCentavos: amount,
        dataSaldoInicial,
        ativo: true,
        observacoes: observacoes.trim() || undefined,
      });
      setNome('');
      setInstituicao('');
      setTipo('CONTA_CORRENTE');
      setSaldoInicial('0,00');
      setDataSaldoInicial(getCurrentDateISO());
      setObservacoes('');
      setError('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar a conta.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-orange-500" /> Contas bancárias
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Cadastre suas contas e acompanhe os saldos iniciais usados nos cálculos financeiros.
          </p>
        </div>
        <button type="button" onClick={() => { setError(''); setShowForm((value) => !value); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-600">
          <Plus className="w-4 h-4" /> {showForm ? 'Fechar cadastro' : 'Adicionar conta'}
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Saldo inicial das contas ativas</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Contas cadastradas</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{accounts.length}</p>
          <p className="text-[11px] text-slate-500">{activeAccounts.length} ativas</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-white dark:bg-slate-800 p-5 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Nova conta bancária</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nome da conta
              <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Conta principal"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Banco / instituição
              <input required value={instituicao} onChange={(e) => setInstituicao(e.target.value)} placeholder="Ex.: Itaú"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tipo de conta
              <select value={tipo} onChange={(e) => setTipo(e.target.value as AccountType)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm">
                {ACCOUNT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Saldo inicial (R$)
              <input required value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} inputMode="decimal" placeholder="0,00"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Data-base do saldo
              <input required type="date" value={dataSaldoInicial} onChange={(e) => setDataSaldoInicial(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
              Observações (opcional)
              <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Agência, apelido ou observações"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm" />
            </label>
          </div>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold">Cancelar</button>
            <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600">Salvar conta</button>
          </div>
        </form>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Minhas contas</h3>
        </div>
        {accounts.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="mx-auto h-8 w-8 text-orange-500" />
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Nenhuma conta cadastrada</p>
            <p className="mt-1 text-xs text-slate-500">Adicione sua primeira conta para registrar saldos e pagamentos de faturas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="rounded-xl bg-orange-500/10 p-3 text-orange-500"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{account.nome}</p>
                    <p className="text-xs text-slate-500">{account.instituicao} • {ACCOUNT_TYPES.find((item) => item.value === account.tipo)?.label || account.tipo}</p>
                    <p className="text-[11px] text-slate-400">Data-base: {formatDateBR(account.dataSaldoInicial)}</p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(account.saldoInicialCentavos)}</p>
                  <span className={account.ativo ? 'text-[10px] font-bold text-orange-600' : 'text-[10px] font-bold text-slate-400'}>
                    {account.ativo ? 'ATIVA' : 'INATIVA'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
