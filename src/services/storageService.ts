import {
  Account,
  Category,
  CreditCard,
  Transaction,
  Invoice,
  InstallmentPlan,
  Recurrence,
  Budget,
  Debt,
  PatrimonyItem,
  Investment,
  Goal,
  AuditLog,
  SystemSettings,
} from '../types/finance';
import {
  INITIAL_SETTINGS,
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_CARDS,
  INITIAL_RECURRENCES,
  INITIAL_INSTALLMENTS,
  INITIAL_DEBTS,
  INITIAL_PATRIMONY,
  INITIAL_INVESTMENTS,
  INITIAL_GOALS,
  INITIAL_TRANSACTIONS,
  INITIAL_INVOICES,
  INITIAL_BUDGETS,
  INITIAL_AUDIT,
} from './initialData';

const STORAGE_KEY = 'BF_FINANCE_OS_DATA_V1';

export interface StorageData {
  settings: SystemSettings;
  accounts: Account[];
  categories: Category[];
  cards: CreditCard[];
  transactions: Transaction[];
  invoices: Invoice[];
  installments: InstallmentPlan[];
  recurrences: Recurrence[];
  budgets: Budget[];
  debts: Debt[];
  patrimony: PatrimonyItem[];
  investments: Investment[];
  goals: Goal[];
  audit: AuditLog[];
}

class StorageService {
  private data: StorageData;
  private listeners: Array<() => void> = [];

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StorageData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.accounts && parsed.transactions) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not parse stored BF Finance data, initializing defaults', e);
    }

    const defaultData: StorageData = {
      settings: INITIAL_SETTINGS,
      accounts: INITIAL_ACCOUNTS,
      categories: INITIAL_CATEGORIES,
      cards: INITIAL_CARDS,
      transactions: INITIAL_TRANSACTIONS,
      invoices: INITIAL_INVOICES,
      installments: INITIAL_INSTALLMENTS,
      recurrences: INITIAL_RECURRENCES,
      budgets: INITIAL_BUDGETS,
      debts: INITIAL_DEBTS,
      patrimony: INITIAL_PATRIMONY,
      investments: INITIAL_INVESTMENTS,
      goals: INITIAL_GOALS,
      audit: INITIAL_AUDIT,
    };
    this.persist(defaultData);
    return defaultData;
  }

  private persist(data: StorageData) {
    this.data = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getData(): StorageData {
    return this.data;
  }

  // Log an audit entry
  public logAudit(
    acao: AuditLog['acao'],
    entidade: string,
    registroId: string,
    motivo: string,
    valorAnterior?: string,
    valorPosterior?: string,
    usuario: string = this.data.settings.nomeProprietario
  ) {
    const newEntry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      usuario,
      acao,
      entidade,
      registroId,
      valorAnterior,
      valorPosterior,
      motivo,
      origem: 'SISTEMA_WEB',
    };
    this.data.audit = [newEntry, ...this.data.audit];
    this.persist({ ...this.data });
  }

  // Transactions CRUD
  public addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, reason: string = 'Inclusão de lançamento'): Transaction {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    this.data.transactions = [newTx, ...this.data.transactions];
    this.logAudit('CRIAR', 'LANÇAMENTOS', newTx.id, reason, undefined, JSON.stringify(newTx));
    this.persist({ ...this.data });
    return newTx;
  }

  public updateTransaction(txId: string, updates: Partial<Transaction>, reason: string = 'Edição de lançamento'): Transaction | null {
    const idx = this.data.transactions.findIndex((t) => t.id === txId);
    if (idx === -1) return null;

    const previous = this.data.transactions[idx];
    const updated: Transaction = {
      ...previous,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.transactions[idx] = updated;
    this.logAudit('EDITAR', 'LANÇAMENTOS', txId, reason, JSON.stringify(previous), JSON.stringify(updated));
    this.persist({ ...this.data });
    return updated;
  }

  public deleteTransaction(txId: string, reason: string = 'Exclusão lógica'): boolean {
    const idx = this.data.transactions.findIndex((t) => t.id === txId);
    if (idx === -1) return false;

    const previous = this.data.transactions[idx];
    // Logical deletion: never erase silently
    const updated: Transaction = {
      ...previous,
      isDeleted: true,
      status: 'CANCELADO',
      updatedAt: new Date().toISOString(),
    };

    this.data.transactions[idx] = updated;
    this.logAudit('EXCLUIR_LOGICA', 'LANÇAMENTOS', txId, reason, JSON.stringify(previous), 'isDeleted: true');
    this.persist({ ...this.data });
    return true;
  }

  // Invoice Payment (Liquidação sem duplicar despesa)
  public payInvoice(
    invoiceId: string,
    contaBancariaId: string,
    valorPagoCentavos: number,
    formaPagamento: string = 'PIX Débito em Conta'
  ): { success: boolean; message: string } {
    const inv = this.data.invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, message: 'Fatura não encontrada.' };

    const conta = this.data.accounts.find((a) => a.id === contaBancariaId);
    if (!conta) return { success: false, message: 'Conta bancária de pagamento não encontrada.' };

    const novoValorPago = inv.valorPagoCentavos + valorPagoCentavos;
    const novoSaldoRestante = Math.max(0, inv.valorTotalCentavos - novoValorPago);
    const novoStatus = novoSaldoRestante === 0 ? 'PAGA' : 'PARCIALMENTE_PAGA';

    // 1. Create a LIQUIDACAO transaction in bank account (reduces bank balance, NOT counted as new expense)
    const card = this.data.cards.find((c) => c.id === inv.cartaoId);
    const cardName = card ? card.nome : 'Cartão';
    const txLiquidacao = this.addTransaction(
      {
        data: new Date().toISOString().split('T')[0],
        competencia: inv.competencia,
        descricao: `Pagamento Fatura ${cardName} (${inv.competencia})`,
        tipo: 'LIQUIDACAO',
        categoriaId: 'cat-desp-12', // Categoria de liquidação
        contaId: contaBancariaId,
        formaPagamento,
        valorCentavos: valorPagoCentavos,
        status: 'REALIZADO',
        observacoes: `Liquidação de obrigação do cartão ${cardName}. Não duplica despesas já lançadas no cartão.`,
        origem: 'SISTEMA',
      },
      `Pagamento de fatura ${inv.id}`
    );

    // 2. Update invoice status
    inv.valorPagoCentavos = novoValorPago;
    inv.saldoRestanteCentavos = novoSaldoRestante;
    inv.status = novoStatus;
    inv.pagamentoTransacaoId = txLiquidacao.id;

    this.logAudit(
      'PAGAMENTO_FATURA',
      'FATURAS',
      inv.id,
      `Pagamento de fatura no valor de R$ ${(valorPagoCentavos / 100).toFixed(2)} via conta ${conta.nome}`,
      undefined,
      JSON.stringify(inv)
    );

    this.persist({ ...this.data });
    return { success: true, message: 'Pagamento de fatura registrado com sucesso!' };
  }

  // Account operations
  public addAccount(acc: Omit<Account, 'id'>): Account {
    const newAcc: Account = {
      ...acc,
      id: `acc-${Date.now()}`,
    };
    this.data.accounts.push(newAcc);
    this.logAudit('CRIAR', 'CONTAS', newAcc.id, `Criação da conta ${newAcc.nome}`, undefined, JSON.stringify(newAcc));
    this.persist({ ...this.data });
    return newAcc;
  }

  public updateSettings(settings: Partial<SystemSettings>) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.logAudit('EDITAR', 'CONFIGURAÇÕES', 'settings', 'Atualização das configurações do sistema');
    this.persist({ ...this.data });
  }

  // Reset to default sample data
  public resetToDefault() {
    const defaultData: StorageData = {
      settings: INITIAL_SETTINGS,
      accounts: INITIAL_ACCOUNTS,
      categories: INITIAL_CATEGORIES,
      cards: INITIAL_CARDS,
      transactions: INITIAL_TRANSACTIONS,
      invoices: INITIAL_INVOICES,
      installments: INITIAL_INSTALLMENTS,
      recurrences: INITIAL_RECURRENCES,
      budgets: INITIAL_BUDGETS,
      debts: INITIAL_DEBTS,
      patrimony: INITIAL_PATRIMONY,
      investments: INITIAL_INVESTMENTS,
      goals: INITIAL_GOALS,
      audit: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          usuario: 'Barbosa Fernandes',
          acao: 'CRIAR',
          entidade: 'SISTEMA',
          registroId: 'sys-reset',
          motivo: 'Restauração da base padrão BF Finance OS',
          origem: 'SISTEMA',
        },
      ],
    };
    this.persist(defaultData);
  }

  // Full Import
  public importData(imported: StorageData, reason: string = 'Restauração de Backup') {
    this.data = imported;
    this.logAudit('CRIAR', 'SISTEMA', 'backup-restore', reason);
    this.persist(imported);
  }
}

export const storageService = new StorageService();
