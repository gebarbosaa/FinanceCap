import { StorageData } from './storageService';
import {
  calculateAccountBalance,
  calculateCardLimits,
  calculateFinancialSummary,
  getTop15Expenses,
} from './financeEngine';
import { formatCurrency, getCurrentCompetencia } from './currency';

export interface IntelligenceAnswer {
  pergunta: string;
  resposta: string;
  tipoDado: 'DADO_REAL' | 'DADO_PREVISTO' | 'DADO_ESTIMADO';
  origemRastreavel: string[];
  recomendacao?: string;
  destaque?: string;
}

export function queryBFIntelligence(pergunta: string, data: StorageData): IntelligenceAnswer {
  const currentComp = getCurrentCompetencia();
  const summary = calculateFinancialSummary(
    data.accounts,
    data.cards,
    data.transactions,
    data.invoices,
    data.installments,
    data.debts,
    data.patrimony,
    data.investments,
    data.settings,
    currentComp
  );

  const cleanQuery = pergunta.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();

  // 1. Qual meu saldo atual?
  if (cleanQuery.includes('saldo atual') || cleanQuery.includes('quanto tenho')) {
    const contasDetalhes = data.accounts
      .filter((a) => a.ativo)
      .map((a) => `${a.nome}: ${formatCurrency(calculateAccountBalance(a, data.transactions))}`);

    return {
      pergunta: 'Qual meu saldo atual?',
      resposta: `Seu saldo bancário consolidado hoje é de ${formatCurrency(summary.saldoTotalBancosCentavos)}.`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: [
        `Soma dos saldos calculados das ${data.accounts.filter((a) => a.ativo).length} contas bancárias ativas.`,
        ...contasDetalhes,
      ],
      recomendacao:
        'Mantenha ao menos 3 a 6 meses de despesas fixas na conta de reserva de liquidez imediata.',
      destaque: formatCurrency(summary.saldoTotalBancosCentavos),
    };
  }

  // 2. Quanto posso gastar hoje? (Dinheiro disponível para gastar)
  if (cleanQuery.includes('posso gastar') || cleanQuery.includes('disponivel') || cleanQuery.includes('dinheiro disponivel')) {
    return {
      pergunta: 'Quanto posso gastar hoje?',
      resposta: `Você tem ${formatCurrency(summary.dinheiroDisponivelGastarCentavos)} de dinheiro realmente livre para gastar com segurança.`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: [
        `Metodologia estrita Barbosa Fernandes:`,
        `(+) Saldo Bancário Real: ${formatCurrency(summary.saldoTotalBancosCentavos)}`,
        `(-) Despesas Pendentes do Mês: ${formatCurrency(summary.despesasPendentesMesCentavos)}`,
        `(-) Faturas Abertas a Vencer: ${formatCurrency(summary.faturasAbertasCentavos)}`,
        `(=) Dinheiro Seguro Disponível: ${formatCurrency(summary.dinheiroDisponivelGastarCentavos)}`,
        `Nota de integridade: receitas previstas não são somadas para evitar superestimar o dinheiro disponível.`,
      ],
      recomendacao:
        'Se você tiver novas despesas não essenciais, limite-se a este montante disponível para não entrar em juros de rotativo ou cheque especial.',
      destaque: formatCurrency(summary.dinheiroDisponivelGastarCentavos),
    };
  }

  // 3. Quanto gastei este mês?
  if (cleanQuery.includes('gastei este mes') || cleanQuery.includes('gastos do mes') || cleanQuery.includes('despesas do mes')) {
    return {
      pergunta: 'Quanto gastei este mês?',
      resposta: `Nesta competência (${currentComp}), você realizou ${formatCurrency(summary.despesasMesCentavos)} em despesas efetivadas, com mais ${formatCurrency(summary.despesasPendentesMesCentavos)} previstas/pendentes até o fim do ciclo.`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: [
        `Lançamentos do tipo DESPESA com competência ${currentComp} e status REALIZADO.`,
        `Total de despesas efetivadas: ${formatCurrency(summary.despesasMesCentavos)}`,
        `Total pendente agendado: ${formatCurrency(summary.despesasPendentesMesCentavos)}`,
      ],
      destaque: formatCurrency(summary.despesasMesCentavos),
    };
  }

  // 4. Quanto recebi?
  if (cleanQuery.includes('recebi') || cleanQuery.includes('receitas') || cleanQuery.includes('renda')) {
    return {
      pergunta: 'Quanto recebi este mês?',
      resposta: `Você já recebeu ${formatCurrency(summary.receitasMesCentavos)} de receitas confirmadas na competência atual.`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: [
        `Lançamentos do tipo RECEITA com status REALIZADO.`,
        `Valores identificados como receitas realizadas na competência ${currentComp}.`,
      ],
      destaque: formatCurrency(summary.receitasMesCentavos),
    };
  }

  // 5. Qual minha maior categoria de despesas?
  if (cleanQuery.includes('maior categoria') || cleanQuery.includes('categoria')) {
    const catMap = new Map<string, number>();
    for (const tx of data.transactions) {
      if (!tx.isDeleted && tx.tipo === 'DESPESA' && tx.competencia === currentComp && tx.status === 'REALIZADO') {
        catMap.set(tx.categoriaId, (catMap.get(tx.categoriaId) || 0) + tx.valorCentavos);
      }
    }

    let topCatId = '';
    let topVal = 0;
    for (const [id, val] of catMap.entries()) {
      if (val > topVal) {
        topVal = val;
        topCatId = id;
      }
    }
    const catObj = data.categories.find((c) => c.id === topCatId);
    const catNome = catObj ? catObj.nome : 'Nenhuma';

    return {
      pergunta: 'Qual minha maior categoria de despesas?',
      resposta: `Sua maior categoria de despesas neste mês é ${catNome}, totalizando ${formatCurrency(topVal)}.`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: [
        `Consolidação de transações de saída agrupadas por categoria na competência ${currentComp}.`,
      ],
      recomendacao: topVal > 0 ? `Acompanhe os próximos lançamentos de ${catNome} e compare o total com o orçamento definido.` : undefined,
      destaque: catNome,
    };
  }

  // 6. Qual cartão está mais comprometido?
  if (cleanQuery.includes('cartao') || cleanQuery.includes('cartao') || cleanQuery.includes('limite')) {
    if (data.cards.length === 0) {
      return { pergunta: 'Qual cartão está mais comprometido?', resposta: 'Ainda não há cartões cadastrados para comparar os limites.', tipoDado: 'DADO_REAL', origemRastreavel: ['Nenhum cartão foi encontrado na base atual.'] };
    }
    let worstCard = data.cards[0];
    let highestPct = -1;
    let usedVal = 0;

    for (const c of data.cards) {
      const limits = calculateCardLimits(c, data.transactions, data.installments);
      const pct = limits.limiteTotalCentavos > 0 ? (limits.limiteUtilizadoCentavos / limits.limiteTotalCentavos) * 100 : 0;
      if (pct > highestPct) {
        highestPct = pct;
        worstCard = c;
        usedVal = limits.limiteUtilizadoCentavos;
      }
    }

    return {
      pergunta: 'Qual cartão está mais comprometido?',
      resposta: `O cartão mais comprometido é o ${worstCard.nome}, com ${highestPct.toFixed(1)}% do limite total utilizado (${formatCurrency(usedVal)} de ${formatCurrency(worstCard.limiteTotalCentavos)}).`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: [
        `Cálculo: (Faturas abertas no ciclo atual + saldo devedor de parcelas futuras do cartão) / Limite Total`,
      ],
      recomendacao:
        'Evite concentrar novas compras parceladas neste cartão para preservar sua margem de segurança de crédito.',
      destaque: `${worstCard.nome} (${highestPct.toFixed(1)}%)`,
    };
  }

  // 7. Quanto tenho em parcelas futuras?
  if (cleanQuery.includes('parcelas') || cleanQuery.includes('parcelamento') || cleanQuery.includes('parcelado')) {
    let totalParcelasFuturas = 0;
    const descricoes = data.installments.map((inst) => {
      totalParcelasFuturas += inst.saldoRestanteCentavos;
      return `${inst.descricao}: ${inst.parcelasFuturas}x de ${formatCurrency(inst.valorParcelaCentavos)} (Saldo: ${formatCurrency(inst.saldoRestanteCentavos)})`;
    });

    return {
      pergunta: 'Quanto tenho em parcelas futuras?',
      resposta: `Você possui um total de ${formatCurrency(totalParcelasFuturas)} em parcelas futuras a vencer distribuídas em ${data.installments.length} compras parceladas ativas.`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: descricoes,
      destaque: formatCurrency(totalParcelasFuturas),
    };
  }

  // 8. Quanto devo? (Dívidas totais)
  if (cleanQuery.includes('devo') || cleanQuery.includes('divida') || cleanQuery.includes('divida') || cleanQuery.includes('financiamento')) {
    const dividasDesc = data.debts.map(
      (d) => `${d.credor} (${d.tipo}): Saldo devedor de ${formatCurrency(d.saldoDevedorCentavos)} com ${d.parcelasRestantes} parcelas restantes`
    );

    return {
      pergunta: 'Quanto devo?',
      resposta: `Seu endividamento total estruturado é de ${formatCurrency(summary.totalDividasCentavos)} com base nos saldos de dívidas cadastrados.`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: dividasDesc,
      recomendacao:
        'Antes de antecipar pagamentos, compare o custo efetivo da dívida com o rendimento líquido das suas reservas e preserve sua liquidez.' ,
      destaque: formatCurrency(summary.totalDividasCentavos),
    };
  }

  // 9. Qual meu patrimônio líquido?
  if (cleanQuery.includes('patrimonio') || cleanQuery.includes('patrimonio') || cleanQuery.includes('riqueza') || cleanQuery.includes('bens')) {
    return {
      pergunta: 'Qual meu patrimônio líquido?',
      resposta: `Seu Patrimônio Líquido avaliado hoje é de ${formatCurrency(summary.patrimonioLiquidoCentavos)}.`,
      tipoDado: 'DADO_REAL',
      origemRastreavel: [
        `Total de ativos registrados: ${formatCurrency(summary.totalAtivosCentavos)}`,
        `Total de passivos registrados: ${formatCurrency(summary.totalPassivosCentavos)}`,
        `Patrimônio Líquido = Ativos (${formatCurrency(summary.totalAtivosCentavos)}) - Passivos (${formatCurrency(summary.totalPassivosCentavos)})`,
      ],
      destaque: formatCurrency(summary.patrimonioLiquidoCentavos),
    };
  }

  // 10. Quanto sobrará no fim do mês?
  if (cleanQuery.includes('sobrara') || cleanQuery.includes('sobrar') || cleanQuery.includes('fim do mes') || cleanQuery.includes('projecao')) {
    const projecao = summary.receitasMesCentavos + summary.receitasPrevistasMesCentavos - (summary.despesasMesCentavos + summary.despesasPendentesMesCentavos + summary.faturasAbertasCentavos);
    return {
      pergunta: 'Quanto sobrará no fim do mês?',
      resposta: `A projeção estimada para o fechamento deste mês indica uma sobra de ${formatCurrency(projecao)} no fluxo de caixa líquido.`,
      tipoDado: 'DADO_PREVISTO',
      origemRastreavel: [
        `Receitas confirmadas + previstas: ${formatCurrency(summary.receitasMesCentavos + summary.receitasPrevistasMesCentavos)}`,
        `Despesas realizadas + pendentes: ${formatCurrency(summary.despesasMesCentavos + summary.despesasPendentesMesCentavos)}`,
        `Faturas abertas a quitar: ${formatCurrency(summary.faturasAbertasCentavos)}`,
      ],
      recomendacao:
        'Destine automaticamente ao menos 50% deste saldo excedente para suas metas prioritárias (Reserva Estratégica e Aporte 1M).',
      destaque: formatCurrency(projecao),
    };
  }

  // Default fallback query
  const topExpenses = getTop15Expenses(data.transactions, data.categories, currentComp);
  return {
    pergunta: pergunta,
    resposta: `Posso apresentar um resumo da sua situação financeira: saldo bancário de ${formatCurrency(summary.saldoTotalBancosCentavos)}, disponibilidade calculada de ${formatCurrency(summary.dinheiroDisponivelGastarCentavos)} e patrimônio líquido registrado de ${formatCurrency(summary.patrimonioLiquidoCentavos)}. Para responder à pergunta específica, preciso de mais detalhes.`, 
    tipoDado: 'DADO_REAL',
    origemRastreavel: [
      `Cálculo integrado do motor financeiro Barbosa Fernandes (centavos inteiros).`,
      `Base rastreável: ${data.accounts.filter((a) => a.ativo).length} contas ativas, ${data.cards.filter((c) => c.ativo).length} cartões ativos e ${data.transactions.filter((tx) => !tx.isDeleted).length} lançamentos não excluídos.`, 
    ],
    destaque: formatCurrency(summary.dinheiroDisponivelGastarCentavos),
  };
}
