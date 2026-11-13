import React, { useState } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CreditCard,
  Layers,
  CheckCircle,
} from 'lucide-react';
import {
  Account,
  Category,
  CreditCard as ICreditCard,
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../types/finance';
import { getCurrentDateISO, parseToCentavos } from '../services/currency';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  cards: ICreditCard[];
  categories: Category[];
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  cards,
  categories,
  onSaveTransaction,
}) => {
  const [tipo, setTipo] = useState<TransactionType>('DESPESA');
  const [descricao, setDescricao] = useState('');
  const [valorStr, setValorStr] = useState('');
  const [data, setData] = useState(getCurrentDateISO());
  const [categoriaId, setCategoriaId] = useState(categories[0]?.id || '');
  const [targetType, setTargetType] = useState<'CONTA' | 'CARTAO'>('CONTA');
  const [contaId, setContaId] = useState(accounts[0]?.id || '');
  const [contaDestinoId, setContaDestinoId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [cartaoId, setCartaoId] = useState(cards[0]?.id || '');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [status, setStatus] = useState<TransactionStatus>('REALIZADO');
  const [observacoes, setObservacoes] = useState('');

  if (!isOpen) return null;

  const availableCategories = categories.filter((category) => category.ativo !== false && category.tipo === (tipo === 'RECEITA' ? 'RECEITA' : 'DESPESA'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const centavos = parseToCentavos(valorStr);
    if (centavos <= 0) {
      alert('Informe um valor monetário positivo válido.');
      return;
    }
    if (!descricao.trim()) {
      alert('Informe a descrição do lançamento.');
      return;
    }

    if (tipo === 'TRANSFERENCIA' && (!contaId || !contaDestinoId || contaId === contaDestinoId)) {
      alert('Selecione contas de origem e destino diferentes.');
      return;
    }
    if (tipo !== 'TRANSFERENCIA' && targetType === 'CONTA' && !accounts.some((account) => account.id === contaId && account.ativo)) {
      alert('Selecione uma conta bancária ativa.');
      return;
    }
    if (tipo === 'DESPESA' && targetType === 'CARTAO' && !cards.some((card) => card.id === cartaoId && card.ativo)) {
      alert('Selecione um cartão de crédito ativo.');
      return;
    }
    if (tipo !== 'TRANSFERENCIA' && !availableCategories.some((category) => category.id === categoriaId)) {
      alert('Selecione uma categoria válida.');
      return;
    }

    const competencia = data.substring(0, 7);

    try {
    onSaveTransaction({
      data,
      competencia,
      descricao: descricao.trim(),
      tipo,
      categoriaId: tipo === 'TRANSFERENCIA' ? 'cat-desp-12' : categoriaId,
      contaId: targetType === 'CONTA' || tipo === 'TRANSFERENCIA' ? contaId : undefined,
      contaDestinoId: tipo === 'TRANSFERENCIA' ? contaDestinoId : undefined,
      cartaoId: targetType === 'CARTAO' && tipo === 'DESPESA' ? cartaoId : undefined,
      formaPagamento: targetType === 'CARTAO' && tipo === 'DESPESA' ? 'CARTAO_CREDITO' : formaPagamento,
      valorCentavos: centavos,
      status,
      observacoes: observacoes.trim() || undefined,
      origem: 'MANUAL',
    });

    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível gravar o lançamento.');
      return;
    }

    onClose();
    // Reset
    setDescricao('');
    setValorStr('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        {/* Title */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center space-x-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <span>Novo Lançamento Rápido</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setTipo('DESPESA');
              setTargetType('CONTA');
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition ${
              tipo === 'DESPESA'
                ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
            <span>Despesa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTipo('RECEITA');
              setTargetType('CONTA');
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition ${
              tipo === 'RECEITA'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            <span>Receita</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTipo('TRANSFERENCIA');
              setTargetType('CONTA');
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition ${
              tipo === 'TRANSFERENCIA'
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
            <span>Transferência</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Valor and Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Valor (R$):
              </label>
              <input
                type="text"
                placeholder="Ex: 150,00"
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data:
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Descrição do Lançamento:
            </label>
            <input
              type="text"
              placeholder="Ex: Supermercado Pão de Açúcar"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Destination Account / Card */}
          {tipo !== 'TRANSFERENCIA' && (
            <div className="space-y-2">
              <div className="flex space-x-4">
                <label className="flex items-center space-x-1.5 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'CONTA'}
                    onChange={() => setTargetType('CONTA')}
                  />
                  <span>Conta Bancária</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'CARTAO'}
                    onChange={() => setTargetType('CARTAO')}
                  />
                  <span>Cartão de Crédito</span>
                </label>
              </div>

              {targetType === 'CONTA' ? (
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-medium"
                >
                  {accounts.filter((acc) => acc.ativo).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome} ({acc.instituicao})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={cartaoId}
                  onChange={(e) => setCartaoId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-medium"
                >
                  {cards.filter((card) => card.ativo).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.bandeira})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Transfer Source & Destination */}
          {tipo === 'TRANSFERENCIA' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Conta Origem (Saída):
                </label>
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-medium"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Conta Destino (Entrada):
                </label>
                <select
                  value={contaDestinoId}
                  onChange={(e) => setContaDestinoId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-medium"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Categoria */}
          {tipo !== 'TRANSFERENCIA' && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoria:
              </label>
              <select
                value={availableCategories.some((category) => category.id === categoriaId) ? categoriaId : (availableCategories[0]?.id || '')}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-medium"
              >
                {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome} {cat.isGranaExtra ? '(Grana Extra)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Status & Forma de Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-medium"
              >
                <option value="REALIZADO">Realizado</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PREVISTO">Previsto</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Forma de Pagamento:
              </label>
              <input
                type="text"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                placeholder="Ex: PIX, Cartão, Boleto"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observações (Opcional):
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Referência nota fiscal / projeto"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl font-medium"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow cursor-pointer transition"
            >
              Gravar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
