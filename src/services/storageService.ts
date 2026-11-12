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

import { addMonthsToCompetencia } from './currency';

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
  private lastPersistedData: StorageData | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.data = this.loadData();
    if (!this.lastPersistedData) {
      this.lastPersistedData = JSON.parse(JSON.stringify(this.data)) as StorageData;
    }
  }

  private loadData(): StorageData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StorageData>;
        if (parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions)) {
          const normalized: StorageData = {
            settings: { ...INITIAL_SETTINGS, ...(parsed.settings || {}) },
            accounts: parsed.accounts,
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            cards: Array.isArray(parsed.cards) ? parsed.cards : [],
            transactions: parsed.transactions,
            invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
            installments: Array.isArray(parsed.installments) ? parsed.installments : [],
            recurrences: Array.isArray(parsed.recurrences) ? parsed.recurrences : [],
            budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
            debts: Array.isArray(parsed.debts) ? parsed.debts : [],
            patrimony: Array.isArray(parsed.patrimony) ? parsed.patrimony : [],
            investments: Array.isArray(parsed.investments) ? parsed.investments : [],
            goals: Array.isArray(parsed.goals) ? parsed.goals : [],
            audit: Array.isArray(parsed.audit) ? parsed.audit : [],
          };
          return normalized;
        }
      }
    } catch (e) {
      console.warn('Could not parse stored BF Finance data, initializing defaults', e);
    }

    // A first-run installation must never present fabricated balances as real personal finances.
    const defaultData: StorageData = {
      settings: INITIAL_SETTINGS,
      accounts: [],
      categories: INITIAL_CATEGORIES,
      cards: [],
      transactions: [],
      invoices: [],
      installments: [],
      recurrences: [],
      budgets: [],
      debts: [],
      patrimony: [],
      investments: [],
      goals: [],
      audit: [],
    };
    this.persist(defaultData);
    return defaultData;
  }

  private persist(data: StorageData) {
    const serialized = JSON.stringify(data);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      // Restore the last known durable snapshot; never report a failed write as success.
      if (this.lastPersistedData) {
        this.data = JSON.parse(JSON.stringify(this.lastPersistedData)) as StorageData;
      }
      console.error('Failed to save BF Finance data to localStorage', error);
      throw new Error('Não foi possível salvar os dados neste navegador. Verifique o espaço disponível e tente novamente.');
    }

    const durableSnapshot = JSON.parse(serialized) as StorageData;
    this.lastPersistedData = JSON.parse(serialized) as StorageData;
    this.data = durableSnapshot;
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

  // Invoice Payment (atomic settlement without duplicating an expense)
  public payInvoice(
    invoiceId: string,
    contaBancariaId: string,
    valorPagoCentavos: number,
    formaPagamento: string = 'PIX Débito em Conta'
  ): { success: boolean; message: string } {
    const inv = this.data.invoices.find((item) => item.id === invoiceId);
    if (!inv) return { success: false, message: 'Fatura não encontrada.' };

    const conta = this.data.accounts.find((account) => account.id === contaBancariaId);
    if (!conta || !conta.ativo) {
      return { success: false, message: 'Conta bancária ativa para pagamento não encontrada.' };
    }
    if (!Number.isSafeInteger(valorPagoCentavos) || valorPagoCentavos <= 0) {
      return { success: false, message: 'O pagamento deve ser um valor positivo em centavos inteiros.' };
    }
    if (inv.status === 'PAGA' || inv.status === 'CANCELADA') {
      return { success: false, message: 'Esta fatura não aceita novos pagamentos.' };
    }

    const saldoCorreto = Math.max(0, inv.valorTotalCentavos - inv.valorPagoCentavos);
    if (!Number.isSafeInteger(saldoCorreto) || saldoCorreto <= 0 || valorPagoCentavos > saldoCorreto) {
      return { success: false, message: 'O pagamento não pode superar o saldo restante válido da fatura.' };
    }

    const now = new Date().toISOString();
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const card = this.data.cards.find((item) => item.id === inv.cartaoId);
    const cardName = card ? card.nome : 'Cartão';
    const newTransaction: Transaction = {
      id: transactionId,
      data: now.split('T')[0],
      competencia: inv.competencia,
      descricao: `Pagamento Fatura ${cardName} (${inv.competencia})`,
      tipo: 'LIQUIDACAO',
      categoriaId: 'cat-desp-12',
      contaId: contaBancariaId,
      formaPagamento,
      valorCentavos: valorPagoCentavos,
      status: 'REALIZADO',
      observacoes: `Liquidação da fatura ${inv.id}. Não gera nova despesa.`,
      origem: 'SISTEMA',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const updatedInvoice: Invoice = {
      ...inv,
      valorPagoCentavos: inv.valorPagoCentavos + valorPagoCentavos,
      saldoRestanteCentavos: saldoCorreto - valorPagoCentavos,
      status: saldoCorreto - valorPagoCentavos === 0 ? 'PAGA' : 'PARCIALMENTE_PAGA',
      pagamentoTransacaoId: transactionId,
    };

    const makeAudit = (
      entidade: string,
      registroId: string,
      acao: AuditLog['acao'],
      motivo: string,
      valorPosterior?: string
    ): AuditLog => ({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      usuario: this.data.settings.nomeProprietario,
      acao,
      entidade,
      registroId,
      valorPosterior,
      motivo,
      origem: 'SISTEMA_WEB',
    });

    const fullyPaid = updatedInvoice.status === 'PAGA';
    const updatedInstallments = fullyPaid
      ? this.data.installments.map((plan) => {
          if (plan.cartaoId !== inv.cartaoId || plan.parcelasFuturas <= 0) return plan;
          const nextDueCompetencia = addMonthsToCompetencia(plan.primeiraCompetencia, plan.parcelasPagas);
          if (nextDueCompetencia !== inv.competencia) return plan;
          return {
            ...plan,
            parcelasPagas: Math.min(plan.totalParcelas, plan.parcelasPagas + 1),
            parcelasFuturas: Math.max(0, plan.parcelasFuturas - 1),
            saldoRestanteCentavos: Math.max(0, plan.saldoRestanteCentavos - plan.valorParcelaCentavos),
          };
        })
      : this.data.installments;

    const nextData: StorageData = {
      ...this.data,
      transactions: [newTransaction, ...this.data.transactions],
      invoices: this.data.invoices.map((item) => item.id === invoiceId ? updatedInvoice : item),
      installments: updatedInstallments,
      audit: [
        makeAudit('LANÇAMENTOS', transactionId, 'CRIAR', `Liquidação da fatura ${invoiceId}`, JSON.stringify(newTransaction)),
        makeAudit(
          'FATURAS',
          invoiceId,
          'PAGAMENTO_FATURA',
          `Pagamento de ${valorPagoCentavos} centavos pela conta ${conta.nome}`,
          JSON.stringify(updatedInvoice)
        ),
        ...this.data.audit,
      ],
    };

    try {
      this.persist(nextData);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Não foi possível salvar o pagamento. Nenhuma alteração foi confirmada.',
      };
    }

    return { success: true, message: 'Pagamento de fatura registrado com sucesso!' };
  }

  // Category CRUD. Archived categories stay linked to historical transactions.
  public addCategory(category: Omit<Category, 'id'>): Category {
    const nome = category.nome.trim();
    if (!nome) throw new Error('Informe o nome da categoria.');
    const duplicate = this.data.categories.some((item) => item.ativo !== false && item.tipo === category.tipo && item.nome.trim().toLocaleLowerCase() === nome.toLocaleLowerCase());
    if (duplicate) throw new Error('Já existe uma categoria ativa com esse nome e tipo.');
    const created: Category = { ...category, nome, id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ativo: true };
    this.data.categories = [...this.data.categories, created];
    this.logAudit('CRIAR', 'CATEGORIAS', created.id, `Criação da categoria ${created.nome}`, undefined, JSON.stringify(created));
    this.persist({ ...this.data });
    return created;
  }

  public updateCategory(categoryId: string, updates: Partial<Category>): Category | null {
    const index = this.data.categories.findIndex((item) => item.id === categoryId);
    if (index < 0) return null;
    const previous = this.data.categories[index];
    const nome = updates.nome === undefined ? previous.nome : updates.nome.trim();
    if (!nome) throw new Error('Informe o nome da categoria.');
    const tipo = updates.tipo ?? previous.tipo;
    const duplicate = this.data.categories.some((item) => item.id !== categoryId && item.ativo !== false && item.tipo === tipo && item.nome.trim().toLocaleLowerCase() === nome.toLocaleLowerCase());
    if (duplicate) throw new Error('Já existe uma categoria ativa com esse nome e tipo.');
    const updated = { ...previous, ...updates, nome };
    this.data.categories[index] = updated;
    this.logAudit('EDITAR', 'CATEGORIAS', categoryId, `Edição da categoria ${nome}`, JSON.stringify(previous), JSON.stringify(updated));
    this.persist({ ...this.data });
    return updated;
  }

  public archiveCategory(categoryId: string): boolean {
    const category = this.data.categories.find((item) => item.id === categoryId);
    if (!category || category.ativo === false) return false;
    if (categoryId === 'cat-desp-12') throw new Error('Esta categoria é reservada para liquidações internas.');
    const updated = { ...category, ativo: false };
    this.data.categories = this.data.categories.map((item) => item.id === categoryId ? updated : item);
    this.logAudit('EXCLUIR_LOGICA', 'CATEGORIAS', categoryId, `Arquivamento da categoria ${category.nome}; histórico preservado.`, JSON.stringify(category), JSON.stringify(updated));
    this.persist({ ...this.data });
    return true;
  }

  // Persist budget changes by competence/category without creating duplicates.
  public upsertBudget(budget: Budget): Budget {
    if (!Number.isInteger(budget.valorPlanejadoCentavos) || budget.valorPlanejadoCentavos <= 0) {
      throw new Error('O limite do orçamento deve ser um valor positivo em centavos.');
    }
    const existingIndex = this.data.budgets.findIndex(
      (item) => item.competencia === budget.competencia && item.categoriaId === budget.categoriaId
    );
    const previous = existingIndex >= 0 ? this.data.budgets[existingIndex] : undefined;
    const saved: Budget = { ...budget, id: previous?.id ?? budget.id ?? `budget-${Date.now()}` };
    if (existingIndex >= 0) {
      this.data.budgets[existingIndex] = saved;
    } else {
      this.data.budgets = [...this.data.budgets, saved];
    }
    this.logAudit(
      previous ? 'EDITAR' : 'CRIAR',
      'ORÇAMENTOS',
      saved.id,
      `Orçamento atualizado para ${saved.competencia}`,
      previous ? JSON.stringify(previous) : undefined,
      JSON.stringify(saved)
    );
    this.persist({ ...this.data });
    return saved;
  }


  // Persist and audit entities created by the app. Never mutate getData() collections directly.
  public addCard(card: Omit<CreditCard, 'id'>): CreditCard {
    const created: CreditCard = { ...card, id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    this.data.cards = [...this.data.cards, created];
    this.logAudit('CRIAR', 'CARTÕES', created.id, `Cadastro do cartão ${created.nome}`, undefined, JSON.stringify(created));
    this.persist({ ...this.data });
    return created;
  }

  public addInstallment(plan: Omit<InstallmentPlan, 'id'>): InstallmentPlan {
    const created: InstallmentPlan = { ...plan, id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    this.data.installments = [...this.data.installments, created];
    this.logAudit('CRIAR', 'PARCELAMENTOS', created.id, `Cadastro do parcelamento ${created.descricao}`, undefined, JSON.stringify(created));
    this.persist({ ...this.data });
    return created;
  }

  public addDebt(debt: Omit<Debt, 'id'>): Debt {
    const created: Debt = { ...debt, id: `debt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    this.data.debts = [...this.data.debts, created];
    this.logAudit('CRIAR', 'DÍVIDAS', created.id, `Cadastro da dívida ${created.credor}`, undefined, JSON.stringify(created));
    this.persist({ ...this.data });
    return created;
  }

  public addPatrimony(item: Omit<PatrimonyItem, 'id'>): PatrimonyItem {
    const created: PatrimonyItem = { ...item, id: `pat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    this.data.patrimony = [...this.data.patrimony, created];
    this.logAudit('CRIAR', 'PATRIMÔNIO', created.id, `Cadastro patrimonial: ${created.descricao}`, undefined, JSON.stringify(created));
    this.persist({ ...this.data });
    return created;
  }

  public addInvestment(investment: Omit<Investment, 'id'>): Investment {
    const created: Investment = { ...investment, id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    this.data.investments = [...this.data.investments, created];
    this.logAudit('CRIAR', 'INVESTIMENTOS', created.id, `Cadastro do investimento ${created.produto}`, undefined, JSON.stringify(created));
    this.persist({ ...this.data });
    return created;
  }

  public addGoal(goal: Omit<Goal, 'id'>): Goal {
    const created: Goal = { ...goal, id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    this.data.goals = [...this.data.goals, created];
    this.logAudit('CRIAR', 'METAS', created.id, `Cadastro da meta ${created.nome}`, undefined, JSON.stringify(created));
    this.persist({ ...this.data });
    return created;
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

  // Full Import: validate the complete backup before replacing the active data.
  public importData(imported: StorageData, reason: string = 'Restauração de Backup') {
    if (!imported || typeof imported !== 'object' || !imported.settings || typeof imported.settings !== 'object') {
      throw new Error('Backup inválido: configurações não encontradas.');
    }

    const requiredCollections: Array<keyof Omit<StorageData, 'settings'>> = [
      'accounts', 'categories', 'cards', 'transactions', 'invoices', 'installments',
      'recurrences', 'budgets', 'debts', 'patrimony', 'investments', 'goals', 'audit',
    ];
    const missing = requiredCollections.filter((key) => !Array.isArray(imported[key]));
    if (missing.length > 0) {
      throw new Error(`Backup inválido: coleções ausentes ou inválidas (${missing.join(', ')}).`);
    }

    const candidate = JSON.parse(JSON.stringify(imported)) as StorageData;
    const timestamp = new Date().toISOString();
    const restoreAudit: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      usuario: candidate.settings.nomeProprietario || INITIAL_SETTINGS.nomeProprietario,
      acao: 'CRIAR',
      entidade: 'SISTEMA',
      registroId: 'backup-restore',
      motivo: reason,
      origem: 'SISTEMA_WEB',
    };

    this.persist({ ...candidate, audit: [restoreAudit, ...candidate.audit] });
  }
}

export const storageService = new StorageService();
