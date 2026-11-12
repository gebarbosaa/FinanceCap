import {
  Transaction,
  Invoice,
  Budget,
  Category,
  Account,
  Debt,
} from '../types/finance';
import { formatCurrency, formatDateBR, getCurrentCompetencia, getCurrentDateISO } from './currency';
import { calculateAccountBalance } from './financeEngine';

export interface RadarAlert {
  id: string;
  tipo: 'DUPLICIDADE' | 'ORCAMENTO_ESTOURADO' | 'VENCIMENTO_PROXIMO' | 'SALDO_NEGATIVO_RISCO' | 'ANOMALIA';
  nivel: 'URGENTE' | 'ALERTA' | 'INFO';
  titulo: string;
  mensagem: string;
  detalhes?: string;
  valorCentavos?: number;
}

export function runSpendingRadar(
  accounts: Account[],
  transactions: Transaction[],
  invoices: Invoice[],
  budgets: Budget[],
  categories: Category[],
  debts: Debt[]
): RadarAlert[] {
  const alerts: RadarAlert[] = [];
  const currentComp = getCurrentCompetencia();
  const todayISO = getCurrentDateISO();

  // 1. Detect Duplicated Transactions
  const activeTx = transactions.filter((t) => !t.isDeleted && t.tipo === 'DESPESA');
  for (let i = 0; i < activeTx.length; i++) {
    for (let j = i + 1; j < activeTx.length; j++) {
      const a = activeTx[i];
      const b = activeTx[j];
      if (a.valorCentavos === b.valorCentavos && a.descricao.trim().toLowerCase() === b.descricao.trim().toLowerCase()) {
        const timeDiffMs = Math.abs(new Date(a.data).getTime() - new Date(b.data).getTime());
        const daysDiff = timeDiffMs / (1000 * 3600 * 24);
        if (daysDiff <= 3) {
          alerts.push({
            id: `dup-${a.id}-${b.id}`,
            tipo: 'DUPLICIDADE',
            nivel: 'URGENTE',
            titulo: 'Possível Despesa Duplicada Detectada',
            mensagem: `Identificamos dois lançamentos idênticos de "${a.descricao}" no valor de ${formatCurrency(a.valorCentavos)} (em ${formatDateBR(a.data)} e ${formatDateBR(b.data)}).`,
            valorCentavos: a.valorCentavos,
          });
        }
      }
    }
  }

  // 2. Budget Overrun Checks
  const catExpensesMap = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.isDeleted && tx.tipo === 'DESPESA' && tx.competencia === currentComp && tx.status === 'REALIZADO') {
      const current = catExpensesMap.get(tx.categoriaId) || 0;
      catExpensesMap.set(tx.categoriaId, current + tx.valorCentavos);
    }
  }

  for (const bgt of budgets) {
    if (bgt.competencia === currentComp) {
      const spent = catExpensesMap.get(bgt.categoriaId) || 0;
      const cat = categories.find((c) => c.id === bgt.categoriaId);
      const catName = cat ? cat.nome : 'Categoria';
      const pct = (spent / bgt.valorPlanejadoCentavos) * 100;

      if (spent > bgt.valorPlanejadoCentavos) {
        alerts.push({
          id: `bgt-over-${bgt.id}`,
          tipo: 'ORCAMENTO_ESTOURADO',
          nivel: 'URGENTE',
          titulo: `Orçamento Estourado: ${catName}`,
          mensagem: `Gasto realizado de ${formatCurrency(spent)} ultrapassou o teto planejado de ${formatCurrency(bgt.valorPlanejadoCentavos)} (${pct.toFixed(1)}%).`,
          valorCentavos: spent - bgt.valorPlanejadoCentavos,
        });
      } else if (pct >= bgt.alertaPercentual) {
        alerts.push({
          id: `bgt-warn-${bgt.id}`,
          tipo: 'ORCAMENTO_ESTOURADO',
          nivel: 'ALERTA',
          titulo: `Atenção ao Limite: ${catName}`,
          mensagem: `Você atingiu ${pct.toFixed(1)}% do orçamento (${formatCurrency(spent)} de ${formatCurrency(bgt.valorPlanejadoCentavos)}).`,
          valorCentavos: spent,
        });
      }
    }
  }

  // 3. Upcoming Invoices & Due Dates
  for (const inv of invoices) {
    if ((inv.status === 'ABERTA' || inv.status === 'PARCIALMENTE_PAGA') && inv.saldoRestanteCentavos > 0) {
      const dueDate = new Date(inv.dataVencimento);
      const today = new Date(todayISO);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 7 && diffDays >= 0) {
        alerts.push({
          id: `inv-due-${inv.id}`,
          tipo: 'VENCIMENTO_PROXIMO',
          nivel: diffDays <= 3 ? 'URGENTE' : 'ALERTA',
          titulo: `Fatura a Vencer em ${diffDays} dia(s)`,
          mensagem: `Fatura da competência ${inv.competencia} vence em ${formatDateBR(inv.dataVencimento)}. Saldo restante a pagar: ${formatCurrency(inv.saldoRestanteCentavos)}.`,
          valorCentavos: inv.saldoRestanteCentavos,
        });
      }
    }
  }

  // 4. Debts due in next 7 days
  for (const debt of debts) {
    if (debt.status === 'EM_DIA' && debt.proximoVencimento) {
      const dueDate = new Date(debt.proximoVencimento);
      const today = new Date(todayISO);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 7 && diffDays >= 0) {
        alerts.push({
          id: `debt-due-${debt.id}`,
          tipo: 'VENCIMENTO_PROXIMO',
          nivel: 'ALERTA',
          titulo: `Parcela de Dívida Próxima: ${debt.credor}`,
          mensagem: `Vencimento da parcela de ${formatCurrency(debt.valorParcelaCentavos)} previsto para ${formatDateBR(debt.proximoVencimento)}.`,
          valorCentavos: debt.valorParcelaCentavos,
        });
      }
    }
  }

  // 5. Negative Balance Risk
  let totalCash = 0;
  for (const acc of accounts) {
    if (acc.ativo) totalCash += calculateAccountBalance(acc, transactions);
  }
  let upcomingImmediateOutflow = 0;
  for (const inv of invoices) {
    if (inv.status === 'ABERTA') upcomingImmediateOutflow += inv.saldoRestanteCentavos;
  }
  if (totalCash < upcomingImmediateOutflow) {
    alerts.push({
      id: 'risk-negative-balance',
      tipo: 'SALDO_NEGATIVO_RISCO',
      nivel: 'URGENTE',
      titulo: 'Risco de Liquidez / Saldo Insuficiente',
      mensagem: `O saldo bancário consolidado (${formatCurrency(totalCash)}) é inferior aos compromissos imediatos de faturas a vencer (${formatCurrency(upcomingImmediateOutflow)}). Recomendamos resgate de reserva ou aporte imediato.`,
      valorCentavos: upcomingImmediateOutflow - totalCash,
    });
  }

  return alerts;
}
