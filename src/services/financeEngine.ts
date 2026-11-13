import {
  Account,
  Category,
  CreditCard,
  Transaction,
  Invoice,
  InstallmentPlan,
  Debt,
  PatrimonyItem,
  Investment,
  FinancialSummary,
  SystemSettings,
  Recurrence,
} from '../types/finance';
import { addMonthsToCompetencia, getCurrentCompetencia, monthDiff } from './currency';

/**
 * Calculates current actual balance for a specific account based on initial balance and all transactions
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[]
): number {
  let balance = account.saldoInicialCentavos;

  for (const tx of transactions) {
    if (tx.isDeleted || tx.status !== 'REALIZADO' || tx.data < account.dataSaldoInicial) {
      continue;
    }

    // Credits to this account
    if (tx.contaId === account.id) {
      if (tx.tipo === 'RECEITA') {
        balance += tx.valorCentavos;
      } else if (tx.tipo === 'DESPESA' || tx.tipo === 'LIQUIDACAO') {
        balance -= tx.valorCentavos;
      } else if (tx.tipo === 'AJUSTE') {
        // ajuste can be positive or handled according to direction
        balance += tx.valorCentavos;
      } else if (tx.tipo === 'ESTORNO') {
        balance += tx.valorCentavos;
      } else if (tx.tipo === 'TRANSFERENCIA') {
        // Outgoing transfer from this account
        balance -= tx.valorCentavos;
      }
    }

    // Incoming transfer to this account
    if (tx.contaDestinoId === account.id && tx.tipo === 'TRANSFERENCIA') {
      balance += tx.valorCentavos;
    }
  }

  return balance;
}

/**
 * Calculates total available and used limit for a credit card
 * Taking into account current cycle open purchases + remaining future installments
 */
export function calculateCardLimits(
  card: CreditCard,
  transactions: Transaction[],
  installments: InstallmentPlan[],
  invoices: Invoice[] = []
): { limiteTotalCentavos: number; limiteUtilizadoCentavos: number; limiteDisponivelCentavos: number } {
  const limiteTotalCentavos = Math.max(0, card.limiteTotalCentavos || 0);
  let limiteUtilizadoCentavos = 0;

  const validInvoices = invoices.filter(
    (invoice) => invoice.cartaoId === card.id && invoice.status !== 'CANCELADA'
  );
  const invoicedCompetencies = new Set(validInvoices.map((invoice) => invoice.competencia));
  const validInvoiceIds = new Set(validInvoices.map((invoice) => invoice.id));

  // Open invoices reserve only their unpaid balance. Paid invoices release the limit.
  for (const invoice of validInvoices) {
    if (invoice.status === 'PAGA') continue;
    const remaining = Number.isSafeInteger(invoice.saldoRestanteCentavos)
      ? Math.max(0, invoice.saldoRestanteCentavos)
      : 0;
    limiteUtilizadoCentavos += remaining;
  }

  // Purchases not yet represented by an invoice reserve the limit once.
  for (const tx of transactions) {
    if (
      tx.isDeleted ||
      tx.cartaoId !== card.id ||
      tx.tipo !== 'DESPESA' ||
      tx.status === 'CANCELADO' ||
      tx.status === 'ESTORNADO' ||
      tx.parcelamentoId
    ) continue;

    const belongsToInvoice = (tx.faturaId ? validInvoiceIds.has(tx.faturaId) : false) ||
      invoicedCompetencies.has(tx.competencia);
    if (belongsToInvoice) continue;

    if (
      (tx.status === 'REALIZADO' || tx.status === 'PREVISTO' || tx.status === 'PENDENTE') &&
      Number.isSafeInteger(tx.valorCentavos) &&
      tx.valorCentavos > 0
    ) {
      limiteUtilizadoCentavos += tx.valorCentavos;
    }
  }

  // Reserve future installments, but do not reserve a competence already represented
  // by an invoice (open invoices are counted above; paid invoices have released the limit).
  for (const installment of installments) {
    if (installment.cartaoId !== card.id || installment.parcelasFuturas <= 0) continue;

    const linkedInstallmentRows = transactions.filter((transaction) =>
      transaction.parcelamentoId === installment.id &&
      !transaction.isDeleted &&
      transaction.faturaId !== undefined &&
      validInvoiceIds.has(transaction.faturaId)
    );
    let coveredValue = 0;
    if (linkedInstallmentRows.length > 0) {
      coveredValue = linkedInstallmentRows.reduce((sum, transaction) => sum + transaction.valorCentavos, 0);
    } else {
      // Backward compatibility for installment plans created before monthly invoice rows existed.
      let invoiceCoveredInstallments = 0;
      for (let index = 0; index < installment.parcelasFuturas; index++) {
        const competence = addMonthsToCompetencia(
          installment.primeiraCompetencia,
          installment.parcelasPagas + index
        );
        if (validInvoices.some((invoice) => invoice.competencia === competence)) {
          invoiceCoveredInstallments++;
        }
      }
      coveredValue = invoiceCoveredInstallments * installment.valorParcelaCentavos;
    }
    const futureBalance = Math.max(0, (installment.saldoRestanteCentavos || 0) - coveredValue);
    limiteUtilizadoCentavos += futureBalance;
  }

  const limiteDisponivelCentavos = Math.max(0, limiteTotalCentavos - limiteUtilizadoCentavos);
  return { limiteTotalCentavos, limiteUtilizadoCentavos, limiteDisponivelCentavos };
}

export function calculateFinancialSummary(
  accounts: Account[],
  cards: CreditCard[],
  transactions: Transaction[],
  invoices: Invoice[],
  installments: InstallmentPlan[],
  debts: Debt[],
  patrimony: PatrimonyItem[],
  investments: Investment[],
  settings: SystemSettings,
  currentCompetencia: string = getCurrentCompetencia()
): FinancialSummary {
  // 1. Bank balances and operational cash (reserves/investments are not spendable).
  let saldoTotalBancosCentavos = 0;
  let saldoContasOperacionaisCentavos = 0;
  for (const acc of accounts) {
    if (!acc.ativo) continue;
    const accountBalance = calculateAccountBalance(acc, transactions);
    saldoTotalBancosCentavos += accountBalance;
    if (acc.tipo !== 'INVESTIMENTO' && acc.tipo !== 'RESERVA') {
      saldoContasOperacionaisCentavos += accountBalance;
    }
  }

  // 2. Month revenues and expenses
  let receitasMesCentavos = 0;
  let receitasPrevistasMesCentavos = 0;
  let despesasMesCentavos = 0;
  let despesasPendentesMesCentavos = 0;

  for (const tx of transactions) {
    if (tx.isDeleted || tx.competencia !== currentCompetencia) continue;

    // Transfers are neutral: NEVER count as revenue or expense!
    if (tx.tipo === 'TRANSFERENCIA' || tx.tipo === 'LIQUIDACAO') continue;

    if (tx.tipo === 'RECEITA') {
      if (tx.status === 'REALIZADO') {
        receitasMesCentavos += tx.valorCentavos;
      } else if (tx.status === 'PREVISTO' || tx.status === 'PENDENTE') {
        receitasPrevistasMesCentavos += tx.valorCentavos;
      }
    } else if (tx.tipo === 'DESPESA') {
      if (tx.status === 'REALIZADO') {
        despesasMesCentavos += tx.valorCentavos;
      } else if ((tx.status === 'PREVISTO' || tx.status === 'PENDENTE') && !tx.cartaoId && !tx.faturaId) {
        // Card purchases are reserved through the invoice balance below; do not reserve them twice.
        despesasPendentesMesCentavos += tx.valorCentavos;
      }
    }
  }

  // 3. Open invoices
  let faturasAbertasCentavos = 0;
  for (const inv of invoices) {
    if (inv.status === 'ABERTA' || inv.status === 'FECHADA' || inv.status === 'VENCIDA' || inv.status === 'PARCIALMENTE_PAGA') {
      faturasAbertasCentavos += inv.saldoRestanteCentavos;
    }
  }

  // 4. Future commitments (future installments + debts)
  let compromissosFuturosCentavos = 0;
  for (const inst of installments) {
    compromissosFuturosCentavos += inst.saldoRestanteCentavos;
  }
  let totalDividasCentavos = 0;
  for (const debt of debts) {
    if (debt.status !== 'QUITADO') {
      totalDividasCentavos += debt.saldoDevedorCentavos;
      compromissosFuturosCentavos += debt.valorParcelaCentavos * debt.parcelasRestantes;
    }
  }

  // 5. Card Limits consolidated
  let limiteTotalCartoesCentavos = 0;
  let limiteUtilizadoCartoesCentavos = 0;
  for (const card of cards) {
    if (!card.ativo) continue;
    const limits = calculateCardLimits(card, transactions, installments, invoices);
    limiteTotalCartoesCentavos += limits.limiteTotalCentavos;
    limiteUtilizadoCartoesCentavos += limits.limiteUtilizadoCentavos;
  }
  const limiteDisponivelCartoesCentavos = Math.max(0, limiteTotalCartoesCentavos - limiteUtilizadoCartoesCentavos);

  // 6. Dinheiro Disponível para Gastar (Rigorous calculation methodology)
  // Considers: Real bank balances - Pending expenses - Open/due invoices
  // Keep negative values visible: clipping at zero hides a real projected cash deficit.
  const dinheiroDisponivelGastarCentavos =
    saldoContasOperacionaisCentavos - despesasPendentesMesCentavos - faturasAbertasCentavos;

  // 7. Net Worth (Patrimônio Líquido)
  // Total Ativos = Physical Assets + Bank Balances + Investments
  let totalAtivosCentavos = saldoTotalBancosCentavos;
  for (const item of patrimony) {
    if (item.tipo === 'ATIVO') {
      totalAtivosCentavos += item.valorAvaliacaoCentavos;
    }
  }
  for (const inv of investments) {
    totalAtivosCentavos += inv.saldoAtualCentavos;
  }

  // Total Passivos = Debts + Open Invoices
  let totalPassivosCentavos = totalDividasCentavos + faturasAbertasCentavos;
  for (const item of patrimony) {
    if (item.tipo === 'PASSIVO') {
      totalPassivosCentavos += item.valorAvaliacaoCentavos;
    }
  }

  const patrimonioLiquidoCentavos = totalAtivosCentavos - totalPassivosCentavos;

  return {
    saldoTotalBancosCentavos,
    saldoContasOperacionaisCentavos,
    dinheiroDisponivelGastarCentavos,
    receitasMesCentavos,
    receitasPrevistasMesCentavos,
    despesasMesCentavos,
    despesasPendentesMesCentavos,
    faturasAbertasCentavos,
    compromissosFuturosCentavos,
    patrimonioLiquidoCentavos,
    totalAtivosCentavos,
    totalPassivosCentavos,
    totalDividasCentavos,
    limiteTotalCartoesCentavos,
    limiteUtilizadoCartoesCentavos,
    limiteDisponivelCartoesCentavos,
  };
}

/**
 * Top 15 Expenses Ranking:
 * Automatically excludes GRANA EXTRA as demanded by Barbosa Fernandes system rules!
 */
export function getTop15Expenses(
  transactions: Transaction[],
  categories: Category[],
  competencia?: string
): Array<Transaction & { categoriaNome: string; categoriaCor: string }> {
  const granaExtraCatIds = new Set(
    categories.filter((c) => c.isGranaExtra || c.nome.toUpperCase().includes('GRANA EXTRA')).map((c) => c.id)
  );

  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  return transactions
    .filter((tx) => {
      if (tx.isDeleted || tx.tipo !== 'DESPESA' || tx.status === 'CANCELADO') return false;
      if (competencia && tx.competencia !== competencia) return false;
      // Exclude GRANA EXTRA from top 15 ranking!
      if (granaExtraCatIds.has(tx.categoriaId)) return false;
      return true;
    })
    .sort((a, b) => b.valorCentavos - a.valorCentavos)
    .slice(0, 15)
    .map((tx) => {
      const cat = catMap.get(tx.categoriaId);
      return {
        ...tx,
        categoriaNome: cat ? cat.nome : 'Sem Categoria',
        categoriaCor: cat ? cat.cor : '#94A3B8',
      };
    });
}

/**
 * Generates 12-Month Projections (Planejamento 12 Meses)
 */
export function generate12MonthProjection(
  accounts: Account[],
  transactions: Transaction[],
  installments: InstallmentPlan[],
  debts: Debt[],
  startCompetencia: string = getCurrentCompetencia(),
  recurrences: Recurrence[] = []
): Array<{
  competencia: string;
  mesDescricao: string;
  receitasEsperadasCentavos: number;
  despesasFixasCentavos: number;
  parcelasFuturasCentavos: number;
  dividasParcelasCentavos: number;
  saldoProjetadoMesCentavos: number;
  saldoAcumuladoCentavos: number;
}> {
  let acumulado = accounts
    .filter((account) => account.ativo)
    .reduce((sum, account) => sum + calculateAccountBalance(account, transactions), 0);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const result = [];

  for (let i = 0; i < 12; i++) {
    const competencia = addMonthsToCompetencia(startCompetencia, i);
    const monthIndex = Number(competencia.slice(5, 7)) - 1;
    const mesDescricao = `${monthNames[monthIndex]} ${competencia.slice(0, 4)}`;
    let receitasEsperadasCentavos = 0;
    let despesasFixasCentavos = 0;
    let parcelasFuturasCentavos = 0;
    let dividasParcelasCentavos = 0;

    // Include only future planned transactions; realized expenses are already reflected in bank balances.
    for (const tx of transactions) {
      if (tx.isDeleted || tx.parcelamentoId || tx.recorrenciaId || tx.competencia !== competencia || (tx.status !== 'PREVISTO' && tx.status !== 'PENDENTE')) continue;
      if (tx.tipo === 'RECEITA') receitasEsperadasCentavos += tx.valorCentavos;
      if (tx.tipo === 'DESPESA') despesasFixasCentavos += tx.valorCentavos;
    }

    // Project active recurrences using their actual configured values and cadence.
    for (const recurrence of recurrences) {
      if (!recurrence.ativo) continue;
      const anchor = recurrence.ultimaGeracaoCompetencia || addMonthsToCompetencia(startCompetencia, -1);
      const elapsedMonths = monthDiff(anchor, competencia);
      if (elapsedMonths <= 0) continue;
      let due = false;
      switch (recurrence.frequencia) {
        case 'DIARIA':
          due = elapsedMonths > 0;
          if (recurrence.tipo === 'RECEITA') receitasEsperadasCentavos += recurrence.valorCentavos * 30;
          else despesasFixasCentavos += recurrence.valorCentavos * 30;
          break;
        case 'SEMANAL':
          due = true;
          if (recurrence.tipo === 'RECEITA') receitasEsperadasCentavos += Math.round(recurrence.valorCentavos * 4.33);
          else despesasFixasCentavos += Math.round(recurrence.valorCentavos * 4.33);
          break;
        case 'MENSAL':
          due = elapsedMonths > 0;
          break;
        case 'TRIMESTRAL':
          due = elapsedMonths > 0 && elapsedMonths % 3 === 0;
          break;
        case 'SEMESTRAL':
          due = elapsedMonths > 0 && elapsedMonths % 6 === 0;
          break;
        case 'ANUAL':
          due = elapsedMonths > 0 && elapsedMonths % 12 === 0;
          break;
      }
      if (due && recurrence.frequencia !== 'DIARIA' && recurrence.frequencia !== 'SEMANAL') {
        if (recurrence.tipo === 'RECEITA') receitasEsperadasCentavos += recurrence.valorCentavos;
        else despesasFixasCentavos += recurrence.valorCentavos;
      }
    }

    // Count each remaining installment only in its actual future competence.
    for (const installment of installments) {
      if (installment.parcelasFuturas <= 0) continue;
      const firstUnpaidCompetencia = addMonthsToCompetencia(installment.primeiraCompetencia, installment.parcelasPagas);
      const installmentIndex = monthDiff(firstUnpaidCompetencia, competencia);
      if (installmentIndex >= 0 && installmentIndex < installment.parcelasFuturas) {
        parcelasFuturasCentavos += installment.valorParcelaCentavos;
      }
    }

    // Debt installments start at the recorded next due date.
    for (const debt of debts) {
      if (debt.status === 'QUITADO' || debt.parcelasRestantes <= 0 || !debt.proximoVencimento) continue;
      const firstDueCompetencia = debt.proximoVencimento.slice(0, 7);
      const debtMonthIndex = monthDiff(firstDueCompetencia, competencia);
      if (debtMonthIndex >= 0 && debtMonthIndex < debt.parcelasRestantes) {
        dividasParcelasCentavos += debt.valorParcelaCentavos;
      }
    }

    const saldoProjetadoMesCentavos =
      receitasEsperadasCentavos - despesasFixasCentavos - parcelasFuturasCentavos - dividasParcelasCentavos;
    acumulado += saldoProjetadoMesCentavos;

    result.push({
      competencia,
      mesDescricao,
      receitasEsperadasCentavos,
      despesasFixasCentavos,
      parcelasFuturasCentavos,
      dividasParcelasCentavos,
      saldoProjetadoMesCentavos,
      saldoAcumuladoCentavos: acumulado,
    });
  }

  return result;
}
