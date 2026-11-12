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
} from '../types/finance';
import { addMonthsToCompetencia, getCurrentCompetencia } from './currency';

/**
 * Calculates current actual balance for a specific account based on initial balance and all transactions
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[]
): number {
  let balance = account.saldoInicialCentavos;

  for (const tx of transactions) {
    if (tx.isDeleted || tx.status === 'CANCELADO' || tx.status === 'PREVISTO') {
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
  installments: InstallmentPlan[]
): { limiteTotalCentavos: number; limiteUtilizadoCentavos: number; limiteDisponivelCentavos: number } {
  const limiteTotalCentavos = card.limiteTotalCentavos;
  let limiteUtilizadoCentavos = 0;

  // 1. Transactions directly committed on card that are not yet liquidated through invoice
  for (const tx of transactions) {
    if (tx.isDeleted || tx.cartaoId !== card.id || tx.status === 'CANCELADO') continue;

    // Card expenses in current open cycle (not yet marked as liquidated or invoice paid)
    if (tx.tipo === 'DESPESA' && !tx.parcelamentoId && tx.status === 'REALIZADO') {
      limiteUtilizadoCentavos += tx.valorCentavos;
    }
  }

  // 2. Future unliquidated installments committed to this card
  for (const inst of installments) {
    if (inst.cartaoId === card.id) {
      limiteUtilizadoCentavos += inst.saldoRestanteCentavos;
    }
  }

  const limiteDisponivelCentavos = Math.max(0, limiteTotalCentavos - limiteUtilizadoCentavos);

  return {
    limiteTotalCentavos,
    limiteUtilizadoCentavos,
    limiteDisponivelCentavos,
  };
}

/**
 * Calculates executive financial summary with strict methodology:
 * Dinheiro disponível para gastar = Saldo Bancário Real - Despesas Pendentes do Mês - Faturas a Vencer - Reserva Bloqueada
 * Never sums predicted revenues into available spendable cash!
 */
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
  // 1. Bank balances
  let saldoTotalBancosCentavos = 0;
  for (const acc of accounts) {
    if (!acc.ativo) continue;
    saldoTotalBancosCentavos += calculateAccountBalance(acc, transactions);
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
      } else if (tx.status === 'PREVISTO' || tx.status === 'PENDENTE') {
        despesasPendentesMesCentavos += tx.valorCentavos;
      }
    }
  }

  // 3. Open invoices
  let faturasAbertasCentavos = 0;
  for (const inv of invoices) {
    if (inv.status === 'ABERTA' || inv.status === 'VENCIDA' || inv.status === 'PARCIALMENTE_PAGA') {
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
    const limits = calculateCardLimits(card, transactions, installments);
    limiteTotalCartoesCentavos += limits.limiteTotalCentavos;
    limiteUtilizadoCartoesCentavos += limits.limiteUtilizadoCentavos;
  }
  const limiteDisponivelCartoesCentavos = Math.max(0, limiteTotalCartoesCentavos - limiteUtilizadoCartoesCentavos);

  // 6. Dinheiro Disponível para Gastar (Rigorous calculation methodology)
  // Considers: Real bank balances - Pending expenses - Open/due invoices
  const dinheiroDisponivelGastarCentavos = Math.max(
    0,
    saldoTotalBancosCentavos - despesasPendentesMesCentavos - faturasAbertasCentavos
  );

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
  startCompetencia: string = getCurrentCompetencia()
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
  let acumulado = 0;
  for (const acc of accounts) {
    if (acc.ativo) acumulado += calculateAccountBalance(acc, transactions);
  }

  const result = [];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Base recurrent estimates
  const baseRevenuesCentavos = 2500000; // R$ 25.000,00 pro-labore
  const baseFixedExpensesCentavos = 590990; // Fixed recurrent bills

  for (let i = 0; i < 12; i++) {
    const comp = addMonthsToCompetencia(startCompetencia, i);
    const [, mStr] = comp.split('-');
    const mIdx = parseInt(mStr, 10) - 1;
    const mesDescricao = `${monthNames[mIdx]} ${comp.split('-')[0]}`;

    // Calculate installment commitment in this month
    let parcelasFuturasCentavos = 0;
    for (const inst of installments) {
      if (inst.parcelasFuturas > 0 && i < inst.parcelasFuturas) {
        parcelasFuturasCentavos += inst.valorParcelaCentavos;
      }
    }

    // Debts commitment in this month
    let dividasParcelasCentavos = 0;
    for (const debt of debts) {
      if (debt.status !== 'QUITADO' && i < debt.parcelasRestantes) {
        dividasParcelasCentavos += debt.valorParcelaCentavos;
      }
    }

    const receitasEsperadasCentavos = baseRevenuesCentavos;
    const despesasTotalMes = baseFixedExpensesCentavos + parcelasFuturasCentavos + dividasParcelasCentavos;
    const saldoProjetadoMesCentavos = receitasEsperadasCentavos - despesasTotalMes;

    acumulado += saldoProjetadoMesCentavos;

    result.push({
      competencia: comp,
      mesDescricao,
      receitasEsperadasCentavos,
      despesasFixasCentavos: baseFixedExpensesCentavos,
      parcelasFuturasCentavos,
      dividasParcelasCentavos,
      saldoProjetadoMesCentavos,
      saldoAcumuladoCentavos: acumulado,
    });
  }

  return result;
}
