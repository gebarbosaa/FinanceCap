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
import { INITIAL_SETTINGS, INITIAL_CATEGORIES } from './initialData';

import { addMonthsToCompetencia } from './currency';
import { clearCloudSession, loadUserFinance, saveUserFinance, watchUserFinance } from './cloudDataService';
import type { Unsubscribe } from 'firebase/firestore';

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
  private cloudUid: string | null = null;
  private cloudUnsubscribe: Unsubscribe | null = null;
  private cloudSyncError: string | null = null;

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
    if (this.cloudUid) {
      void saveUserFinance(this.cloudUid, durableSnapshot).then(() => {
        this.cloudSyncError = null;
        this.notify();
      }).catch((error: unknown) => {
        this.cloudSyncError = error instanceof Error ? error.message : 'Falha ao sincronizar com a nuvem.';
        console.error('BF Finance OS Firestore sync failed:', error);
        this.notify();
      });
    }
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

  public getCloudSyncError(): string | null {
    return this.cloudSyncError;
  }

  public async connectCloud(uid: string): Promise<void> {
    if (this.cloudUid === uid && this.cloudUnsubscribe) return;
    this.cloudUnsubscribe?.();
    this.cloudUnsubscribe = null;
    this.cloudUid = uid;
    this.cloudSyncError = null;

    try {
      const cloudData = await loadUserFinance(uid, this.data);
      this.data = JSON.parse(JSON.stringify(cloudData)) as StorageData;
      this.lastPersistedData = JSON.parse(JSON.stringify(cloudData)) as StorageData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
      this.cloudUnsubscribe = watchUserFinance(uid, (remoteData) => {
        if (this.cloudUid !== uid) return;
        this.data = JSON.parse(JSON.stringify(remoteData)) as StorageData;
        this.lastPersistedData = JSON.parse(JSON.stringify(remoteData)) as StorageData;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteData));
        } catch (error) {
          console.warn('Could not update local cache from Firestore:', error);
        }
        this.notify();
      }, cloudData);
      this.notify();
    } catch (error) {
      this.cloudUid = null;
      this.cloudSyncError = error instanceof Error ? error.message : 'Não foi possível conectar ao banco de dados.';
      this.notify();
      throw error;
    }
  }

  public disconnectCloud(): void {
    this.cloudUnsubscribe?.();
    this.cloudUnsubscribe = null;
    this.cloudUid = null;
    this.cloudSyncError = null;
    clearCloudSession();
    this.notify();
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
    if (!Number.isSafeInteger(tx.valorCentavos) || tx.valorCentavos <= 0) throw new Error('O valor deve ser positivo e informado em centavos inteiros.');
    if (!tx.descricao.trim()) throw new Error('Informe a descrição do lançamento.');
    if (!/^\d{4}-\\d{2}-\\d{2}$/.test(tx.data)) throw new Error('Informe uma data válida.');
    if (tx.tipo === 'TRANSFERENCIA') {
      if (!tx.contaId || !tx.contaDestinoId) throw new Error('Selecione as contas de origem e destino.');
      if (tx.contaId === tx.contaDestinoId) throw new Error('A conta de origem e a conta de destino devem ser diferentes.');
      if (!this.data.accounts.some((account) => account.id === tx.contaId && account.ativo) ||
          !this.data.accounts.some((account) => account.id === tx.contaDestinoId && account.ativo)) {
        throw new Error('As contas da transferência precisam estar ativas.');
      }
    }
    if (tx.tipo === 'DESPESA' && tx.cartaoId) {
      const card = this.data.cards.find((item) => item.id === tx.cartaoId && item.ativo);
      if (!card) throw new Error('Selecione um cartão de crédito ativo.');
      const [year, month, day] = tx.data.split('-').map(Number);
      const competence = day > card.diaFechamento
        ? addMonthsToCompetencia(`${year}-${String(month).padStart(2, '0')}`, 1)
        : `${year}-${String(month).padStart(2, '0')}`;
      tx = { ...tx, competencia: competence, formaPagamento: 'CARTAO_CREDITO' };
    } else if (tx.tipo !== 'TRANSFERENCIA') {
      if (!tx.contaId || !this.data.accounts.some((account) => account.id === tx.contaId && account.ativo)) {
        throw new Error('Selecione uma conta bancária ativa.');
      }
    }
    if (tx.tipo === 'DESPESA' || tx.tipo === 'RECEITA') {
      if (!this.data.categories.some((category) => category.id === tx.categoriaId && category.tipo === tx.tipo && category.ativo !== false)) {
        throw new Error('Selecione uma categoria ativa compatível com o lançamento.');
      }
    }

    let preparedTx = { ...tx };
    let nextInvoices = [...this.data.invoices];
    if (preparedTx.tipo === 'DESPESA' && preparedTx.cartaoId && preparedTx.status !== 'CANCELADO' && preparedTx.status !== 'ESTORNADO') {
      const card = this.data.cards.find((item) => item.id === preparedTx.cartaoId)!;
      let invoice = nextInvoices.find((item) => item.cartaoId === card.id && item.competencia === preparedTx.competencia);
      if (invoice && (invoice.status === 'PAGA' || invoice.status === 'CANCELADA')) {
        throw new Error('A fatura desta competência já está paga ou cancelada. Confira a data da compra.');
      }
      if (!invoice) {
        const [year, month] = preparedTx.competencia.split('-').map(Number);
        const closeDay = Math.min(card.diaFechamento, new Date(year, month, 0).getDate());
        const dueOffset = card.diaVencimento <= card.diaFechamento ? 1 : 0;
        const dueBase = new Date(year, month - 1 + dueOffset, 1);
        const dueYear = dueBase.getFullYear();
        const dueMonth = dueBase.getMonth() + 1;
        const dueDay = Math.min(card.diaVencimento, new Date(dueYear, dueMonth, 0).getDate());
        invoice = {
          id: `invoice-${card.id}-${preparedTx.competencia}`,
          cartaoId: card.id,
          competencia: preparedTx.competencia,
          dataFechamento: `${year}-${String(month).padStart(2, '0')}-${String(closeDay).padStart(2, '0')}`,
          dataVencimento: `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`,
          valorTotalCentavos: 0,
          valorPagoCentavos: 0,
          saldoRestanteCentavos: 0,
          status: 'ABERTA',
        };
        nextInvoices.push(invoice);
      }
      preparedTx = { ...preparedTx, faturaId: invoice.id };
      const invoiceIndex = nextInvoices.findIndex((item) => item.id === invoice!.id);
      nextInvoices[invoiceIndex] = {
        ...nextInvoices[invoiceIndex],
        valorTotalCentavos: nextInvoices[invoiceIndex].valorTotalCentavos + preparedTx.valorCentavos,
        saldoRestanteCentavos: nextInvoices[invoiceIndex].saldoRestanteCentavos + preparedTx.valorCentavos,
      };
    }

    const now = new Date().toISOString();
    const newTx: Transaction = {
      ...preparedTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    this.data.transactions = [newTx, ...this.data.transactions];
    this.data.invoices = nextInvoices;
    this.logAudit('CRIAR', 'LANÇAMENTOS', newTx.id, reason, undefined, JSON.stringify(newTx));
    this.persist({ ...this.data });
    return newTx;
  }

  public updateTransaction(txId: string, updates: Partial<Transaction>, reason: string = 'Edição de lançamento'): Transaction | null {
    const idx = this.data.transactions.findIndex((t) => t.id === txId && !t.isDeleted);
    if (idx === -1) return null;
    const previous = this.data.transactions[idx];
    if (previous.parcelamentoId || previous.tipo === 'LIQUIDACAO') throw new Error('Parcelas geradas e liquidações de fatura devem ser alteradas pelo módulo de origem.');
    const updated: Transaction = { ...previous, ...updates, updatedAt: new Date().toISOString() };
    if (!Number.isSafeInteger(updated.valorCentavos) || updated.valorCentavos <= 0) throw new Error('O valor deve ser positivo e informado em centavos inteiros.');
    if (!updated.descricao.trim()) throw new Error('A descrição não pode ficar vazia.');
    if (updated.tipo === 'TRANSFERENCIA' && (!updated.contaId || !updated.contaDestinoId || updated.contaId === updated.contaDestinoId)) {
      throw new Error('Uma transferência exige duas contas diferentes.');
    }

    const nextInvoices = [...this.data.invoices];
    if (previous.faturaId) {
      const invoiceIndex = nextInvoices.findIndex((item) => item.id === previous.faturaId);
      if (invoiceIndex >= 0) {
        const invoice = nextInvoices[invoiceIndex];
        const wasIncluded = !previous.isDeleted && previous.status !== 'CANCELADO' && previous.status !== 'ESTORNADO';
        const willBeIncluded = !updated.isDeleted && updated.status !== 'CANCELADO' && updated.status !== 'ESTORNADO';
        const delta = (willBeIncluded ? updated.valorCentavos : 0) - (wasIncluded ? previous.valorCentavos : 0);
        if (delta !== 0 && (invoice.status === 'PAGA' || invoice.status === 'CANCELADA')) {
          throw new Error('Não é possível alterar o valor de uma compra vinculada a uma fatura paga ou cancelada.');
        }
        if (invoice.valorTotalCentavos + delta < invoice.valorPagoCentavos) {
          throw new Error('O novo valor deixaria o total da fatura menor que o valor já pago.');
        }
        nextInvoices[invoiceIndex] = {
          ...invoice,
          valorTotalCentavos: invoice.valorTotalCentavos + delta,
          saldoRestanteCentavos: invoice.saldoRestanteCentavos + delta,
        };
      }
    }
    this.data.transactions[idx] = updated;
    this.data.invoices = nextInvoices;
    this.logAudit('EDITAR', 'LANÇAMENTOS', txId, reason, JSON.stringify(previous), JSON.stringify(updated));
    this.persist({ ...this.data });
    return updated;
  }

  public deleteTransaction(txId: string, reason: string = 'Exclusão lógica'): boolean {
    const idx = this.data.transactions.findIndex((t) => t.id === txId && !t.isDeleted);
    if (idx === -1) return false;
    const previous = this.data.transactions[idx];
    if (previous.parcelamentoId || previous.tipo === 'LIQUIDACAO') throw new Error('Parcelas geradas e liquidações de fatura não podem ser excluídas individualmente.');
    const nextInvoices = [...this.data.invoices];
    if (previous.faturaId && previous.status !== 'CANCELADO' && previous.status !== 'ESTORNADO') {
      const invoiceIndex = nextInvoices.findIndex((item) => item.id === previous.faturaId);
      if (invoiceIndex >= 0) {
        const invoice = nextInvoices[invoiceIndex];
        if (invoice.status === 'PAGA' || invoice.status === 'CANCELADA') throw new Error('Não é possível excluir uma compra de uma fatura paga ou cancelada.');
        if (invoice.valorTotalCentavos - previous.valorCentavos < invoice.valorPagoCentavos) {
          throw new Error('Não é possível excluir esta compra porque a fatura já possui pagamentos vinculados.');
        }
        nextInvoices[invoiceIndex] = {
          ...invoice,
          valorTotalCentavos: invoice.valorTotalCentavos - previous.valorCentavos,
          saldoRestanteCentavos: invoice.saldoRestanteCentavos - previous.valorCentavos,
        };
      }
    }
    const updated: Transaction = { ...previous, isDeleted: true, status: 'CANCELADO', updatedAt: new Date().toISOString() };
    this.data.transactions[idx] = updated;
    this.data.invoices = nextInvoices;
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
          const linkedPaidRows = this.data.transactions.filter(
            (transaction) =>
              transaction.parcelamentoId === plan.id &&
              transaction.faturaId === inv.id &&
              !transaction.isDeleted &&
              transaction.status !== 'CANCELADO' &&
              transaction.status !== 'ESTORNADO'
          );
          if (linkedPaidRows.length > 0) {
            const paidAmount = linkedPaidRows.reduce((sum, transaction) => sum + transaction.valorCentavos, 0);
            const paidCount = linkedPaidRows.length;
            return {
              ...plan,
              parcelasPagas: Math.min(plan.totalParcelas, plan.parcelasPagas + paidCount),
              parcelasFuturas: Math.max(0, plan.parcelasFuturas - paidCount),
              saldoRestanteCentavos: Math.max(0, plan.saldoRestanteCentavos - paidAmount),
            };
          }
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

  // Create one installment plan, its monthly card transactions, and the matching invoices in a single local persistence operation.
  public addInstallmentPurchase(
    plan: Omit<InstallmentPlan, 'id'>,
    categoryId: string
  ): InstallmentPlan {
    const card = plan.cartaoId ? this.data.cards.find((item) => item.id === plan.cartaoId && item.ativo) : undefined;
    if (!card) throw new Error('Selecione um cartão de crédito ativo.');
    const category = this.data.categories.find((item) => item.id === categoryId && item.tipo === 'DESPESA' && item.ativo !== false);
    if (!category) throw new Error('Selecione uma categoria de despesa ativa.');
    if (!Number.isSafeInteger(plan.valorTotalCentavos) || plan.valorTotalCentavos <= 0) throw new Error('O valor total deve ser positivo e informado em centavos inteiros.');
    if (!Number.isInteger(plan.totalParcelas) || plan.totalParcelas < 2 || plan.totalParcelas > 48) throw new Error('A compra deve ter entre 2 e 48 parcelas.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(plan.primeiraCompetencia)) throw new Error('A primeira competência da fatura é inválida.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.dataCompra)) throw new Error('A data da compra é inválida.');
    const planId = `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdPlan: InstallmentPlan = {
      ...plan,
      id: planId,
      parcelasPagas: 0,
      parcelasFuturas: plan.totalParcelas,
      saldoRestanteCentavos: plan.valorTotalCentavos,
    };
    const now = new Date().toISOString();
    const nextInvoices = [...this.data.invoices];
    const newTransactions: Transaction[] = [];

    for (let index = 0; index < plan.totalParcelas; index += 1) {
      const competence = addMonthsToCompetencia(plan.primeiraCompetencia, index);
      const amount = Math.floor(plan.valorTotalCentavos / plan.totalParcelas) + (index < (plan.valorTotalCentavos % plan.totalParcelas) ? 1 : 0);
      let invoice = nextInvoices.find((item) => item.cartaoId === card.id && item.competencia === competence);
      if (invoice && (invoice.status === 'PAGA' || invoice.status === 'CANCELADA')) {
        throw new Error(`A fatura de ${competence} do cartão ${card.nome} já está paga ou cancelada. Revise a primeira competência.`);
      }
      if (!invoice) {
        const [year, month] = competence.split('-').map(Number);
        const closingDate = new Date(year, month - 1, Math.min(card.diaFechamento, new Date(year, month, 0).getDate()));
        const dueMonthOffset = card.diaVencimento <= card.diaFechamento ? 1 : 0;
        const dueBase = new Date(year, month - 1 + dueMonthOffset, 1);
        const dueYear = dueBase.getFullYear();
        const dueMonth = dueBase.getMonth() + 1;
        const dueDay = Math.min(card.diaVencimento, new Date(dueYear, dueMonth, 0).getDate());
        const invoiceId = `invoice-${card.id}-${competence}`;
        invoice = {
          id: invoiceId,
          cartaoId: card.id,
          competencia: competence,
          dataFechamento: `${year}-${String(month).padStart(2, '0')}-${String(closingDate.getDate()).padStart(2, '0')}`,
          dataVencimento: `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`,
          valorTotalCentavos: 0,
          valorPagoCentavos: 0,
          saldoRestanteCentavos: 0,
          status: 'ABERTA',
        };
        nextInvoices.push(invoice);
      }

      const transactionId = `tx-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
      const transaction: Transaction = {
        id: transactionId,
        data: plan.dataCompra,
        competencia: competence,
        descricao: `${plan.descricao} (${index + 1}/${plan.totalParcelas})`,
        tipo: 'DESPESA',
        categoriaId,
        cartaoId: card.id,
        faturaId: invoice.id,
        formaPagamento: 'CARTAO_CREDITO',
        valorCentavos: amount,
        status: 'PENDENTE',
        parcelamentoId: planId,
        parcelaNumero: index + 1,
        totalParcelas: plan.totalParcelas,
        observacoes: `Compra parcelada original: ${plan.descricao}. Valor total: ${plan.valorTotalCentavos} centavos.`,
        origem: 'PARCELAMENTO',
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      newTransactions.push(transaction);
      const invoiceIndex = nextInvoices.findIndex((item) => item.id === invoice!.id);
      const updatedInvoice = {
        ...nextInvoices[invoiceIndex],
        valorTotalCentavos: nextInvoices[invoiceIndex].valorTotalCentavos + amount,
        saldoRestanteCentavos: nextInvoices[invoiceIndex].saldoRestanteCentavos + amount,
      };
      nextInvoices[invoiceIndex] = updatedInvoice;
    }

    createdPlan.compraTransacaoId = newTransactions[0]?.id;
    const auditEntries: AuditLog[] = [
      {
        id: `aud-${Date.now()}-plan`,
        timestamp: now,
        usuario: this.data.settings.nomeProprietario,
        acao: 'CRIAR',
        entidade: 'PARCELAMENTOS',
        registroId: planId,
        valorPosterior: JSON.stringify(createdPlan),
        motivo: `Compra parcelada criada: ${plan.descricao}; ${plan.totalParcelas} parcelas geradas.`,
        origem: 'SISTEMA_WEB',
      },
      ...newTransactions.map((transaction) => ({
        id: `aud-${transaction.id}`,
        timestamp: now,
        usuario: this.data.settings.nomeProprietario,
        acao: 'CRIAR' as AuditLog['acao'],
        entidade: 'LANÇAMENTOS',
        registroId: transaction.id,
        valorPosterior: JSON.stringify(transaction),
        motivo: 'Parcela gerada automaticamente a partir de uma compra parcelada.',
        origem: 'SISTEMA_WEB' as AuditLog['origem'],
      })),
    ];

    this.persist({
      ...this.data,
      installments: [...this.data.installments, createdPlan],
      transactions: [...newTransactions, ...this.data.transactions],
      invoices: nextInvoices,
      audit: [...auditEntries, ...this.data.audit],
    });
    return createdPlan;
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
      audit: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          usuario: INITIAL_SETTINGS.nomeProprietario,
          acao: 'CRIAR',
          entidade: 'SISTEMA',
          registroId: 'sys-reset',
          motivo: 'Restauração para uma base financeira vazia; nenhum saldo fictício foi carregado.',
          origem: 'SISTEMA_WEB',
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
