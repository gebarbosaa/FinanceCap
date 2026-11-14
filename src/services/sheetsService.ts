import { getAccessToken } from './authService';
import { StorageData } from './storageService';
import { formatCurrency, formatDateBR } from './currency';
import { calculateAccountBalance } from './financeEngine';

export const ALL_32_SHEET_NAMES = [
  'CONFIGURAÇÕES',
  'CADASTROS',
  'CONTAS',
  'LANÇAMENTOS',
  'CARTÕES',
  'FATURAS',
  'PARCELAMENTOS',
  'RECORRÊNCIAS',
  'CATEGORIAS',
  'ORÇAMENTO',
  'PLANEJAMENTO',
  'DÍVIDAS',
  'PATRIMÔNIO',
  'INVESTIMENTOS',
  'METAS',
  'AUDITORIA',
  'RELATÓRIOS',
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
  'CONSOLIDAÇÃO',
  'COMPARATIVO',
  'INDICADORES ANUAIS',
];

export async function createFull32TabSpreadsheet(
  title: string = 'FINANCEIRO BARBOSA FERNANDES — BF FINANCE OS'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Não autenticado com o Google. Por favor, conecte sua conta Google.');

  // Create spreadsheet with all 32 sheets
  const sheetsPayload = ALL_32_SHEET_NAMES.map((name, index) => ({
    properties: {
      sheetId: index + 100,
      title: name,
      gridProperties: {
        rowCount: 500,
        columnCount: 20,
        frozenRowCount: 1,
      },
    },
  }));

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
        locale: 'pt_BR',
        timeZone: 'America/Sao_Paulo',
      },
      sheets: sheetsPayload,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Erro ao criar planilha no Google Sheets: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

/**
 * Populates data for all 32 tabs in the Google Sheets spreadsheet
 */
export async function syncDataToGoogleSheets(
  spreadsheetId: string,
  data: StorageData,
  initializeLayout: boolean = false
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Token de acesso expirado ou não disponível');

  // Prepare batch values
  const valueRanges: Array<{ range: string; values: (string | number)[][] }> = [];

  // 1. CONFIGURAÇÕES
  valueRanges.push({
    range: `'CONFIGURAÇÕES'!A1:B10`,
    values: [
      ['Parâmetro', 'Valor'],
      ['Sistema', data.settings.nomeSistema],
      ['Proprietário', data.settings.nomeProprietario],
      ['Moeda', data.settings.moeda],
      ['Idioma', data.settings.idioma],
      ['Fuso Horário', data.settings.fusoHorario],
      ['Ano de Referência', data.settings.anoReferencia],
      ['Mês de Referência', data.settings.mesReferencia],
      ['Meta Reserva Emergência', formatCurrency(data.settings.reservaEmergenciaMetaCentavos)],
      ['Última Sincronização', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })],
    ],
  });

  // 2. CADASTROS
  valueRanges.push({
    range: `'CADASTROS'!A1:D6`,
    values: [
      ['Entidade', 'Tipo', 'Identificador', 'Descrição'],
      ['Barbosa Fernandes', 'Pessoa / Responsável', 'usr-01', 'Titular da Conta e Gestor Financeiro'],
      ['Itaú Unibanco', 'Instituição Financeira', 'inst-itau', 'Banco Múltiplo'],
      ['Nubank', 'Instituição Financeira', 'inst-nu', 'Instituição de Pagamento'],
      ['XP Investimentos', 'Instituição Financeira', 'inst-xp', 'Corretora de Títulos'],
      ['Caixa Econômica', 'Credor', 'inst-cef', 'Agente Fiduciário Habitacional'],
    ],
  });

  // 3. CONTAS
  const contasRows = [
    ['ID', 'Nome', 'Instituição', 'Tipo', 'Saldo Inicial', 'Data Inicial', 'Saldo Calculado', 'Situação', 'Observações'],
    ...data.accounts.map((acc) => [
      acc.id,
      acc.nome,
      acc.instituicao,
      acc.tipo,
      formatCurrency(acc.saldoInicialCentavos),
      formatDateBR(acc.dataSaldoInicial),
      formatCurrency(calculateAccountBalance(acc, data.transactions)),
      acc.ativo ? 'ATIVA' : 'INATIVA',
      acc.observacoes || '',
    ]),
  ];
  valueRanges.push({
    range: `'CONTAS'!A1:I${contasRows.length}`,
    values: contasRows,
  });

  // 4. LANÇAMENTOS
  const txRows = [
    [
      'ID',
      'Data',
      'Competência',
      'Descrição',
      'Tipo',
      'Categoria ID',
      'Conta ID',
      'Cartão ID',
      'Forma Pagamento',
      'Valor',
      'Status',
      'Origem',
      'Observações',
    ],
    ...data.transactions
      .filter((t) => !t.isDeleted)
      .map((t) => [
        t.id,
        formatDateBR(t.data),
        t.competencia,
        t.descricao,
        t.tipo,
        t.categoriaId,
        t.contaId || '',
        t.cartaoId || '',
        t.formaPagamento,
        formatCurrency(t.valorCentavos),
        t.status,
        t.origem,
        t.observacoes || '',
      ]),
  ];
  valueRanges.push({
    range: `'LANÇAMENTOS'!A1:M${Math.max(2, txRows.length)}`,
    values: txRows,
  });

  // 5. CARTÕES
  const cardRows = [
    ['ID', 'Nome', 'Instituição', 'Bandeira', 'Limite Total', 'Dia Fechamento', 'Dia Vencimento', 'Situação'],
    ...data.cards.map((c) => [
      c.id,
      c.nome,
      c.instituicao,
      c.bandeira,
      formatCurrency(c.limiteTotalCentavos),
      c.diaFechamento,
      c.diaVencimento,
      c.ativo ? 'ATIVO' : 'BLOQUEADO',
    ]),
  ];
  valueRanges.push({
    range: `'CARTÕES'!A1:H${cardRows.length}`,
    values: cardRows,
  });

  // 6. FATURAS
  const invRows = [
    ['ID', 'Cartão ID', 'Competência', 'Fechamento', 'Vencimento', 'Valor Total', 'Valor Pago', 'Saldo Restante', 'Status'],
    ...data.invoices.map((inv) => [
      inv.id,
      inv.cartaoId,
      inv.competencia,
      formatDateBR(inv.dataFechamento),
      formatDateBR(inv.dataVencimento),
      formatCurrency(inv.valorTotalCentavos),
      formatCurrency(inv.valorPagoCentavos),
      formatCurrency(inv.saldoRestanteCentavos),
      inv.status,
    ]),
  ];
  valueRanges.push({
    range: `'FATURAS'!A1:I${invRows.length}`,
    values: invRows,
  });

  // 7. PARCELAMENTOS
  const instRows = [
    ['ID', 'Descrição', 'Valor Total', 'Total Parcelas', 'Valor Parcela', 'Data Compra', 'Pagas', 'Futuras', 'Saldo Restante'],
    ...data.installments.map((inst) => [
      inst.id,
      inst.descricao,
      formatCurrency(inst.valorTotalCentavos),
      inst.totalParcelas,
      formatCurrency(inst.valorParcelaCentavos),
      formatDateBR(inst.dataCompra),
      inst.parcelasPagas,
      inst.parcelasFuturas,
      formatCurrency(inst.saldoRestanteCentavos),
    ]),
  ];
  valueRanges.push({
    range: `'PARCELAMENTOS'!A1:I${instRows.length}`,
    values: instRows,
  });

  // 8. RECORRÊNCIAS
  const recRows = [
    ['ID', 'Descrição', 'Valor', 'Tipo', 'Frequência', 'Dia Vencimento', 'Categoria', 'Ativo'],
    ...data.recurrences.map((r) => [
      r.id,
      r.descricao,
      formatCurrency(r.valorCentavos),
      r.tipo,
      r.frequencia,
      r.diaVencimento,
      r.categoriaId,
      r.ativo ? 'SIM' : 'NÃO',
    ]),
  ];
  valueRanges.push({
    range: `'RECORRÊNCIAS'!A1:H${recRows.length}`,
    values: recRows,
  });

  // 9. CATEGORIAS
  const catRows = [
    ['ID', 'Nome', 'Tipo', 'Limite Mensal', 'É Grana Extra'],
    ...data.categories.map((c) => [
      c.id,
      c.nome,
      c.tipo,
      c.limiteMensalCentavos ? formatCurrency(c.limiteMensalCentavos) : 'Ilimitado',
      c.isGranaExtra ? 'SIM (Fora do Top 15)' : 'NÃO',
    ]),
  ];
  valueRanges.push({
    range: `'CATEGORIAS'!A1:E${catRows.length}`,
    values: catRows,
  });

  // 10. ORÇAMENTO
  const bgtRows = [
    ['ID', 'Competência', 'Categoria ID', 'Valor Planejado', 'Alerta %'],
    ...data.budgets.map((b) => [
      b.id,
      b.competencia,
      b.categoriaId,
      formatCurrency(b.valorPlanejadoCentavos),
      `${b.alertaPercentual}%`,
    ]),
  ];
  valueRanges.push({
    range: `'ORÇAMENTO'!A1:E${bgtRows.length}`,
    values: bgtRows,
  });

  // 12. DÍVIDAS
  const debtRows = [
    ['ID', 'Credor', 'Tipo', 'Principal', 'Saldo Devedor', 'Juros a.m.', 'Parcelas Restantes', 'Valor Parcela', 'Status'],
    ...data.debts.map((d) => [
      d.id,
      d.credor,
      d.tipo,
      formatCurrency(d.principalContratadoCentavos),
      formatCurrency(d.saldoDevedorCentavos),
      `${d.taxaJurosMensalPercentual}%`,
      d.parcelasRestantes,
      formatCurrency(d.valorParcelaCentavos),
      d.status,
    ]),
  ];
  valueRanges.push({
    range: `'DÍVIDAS'!A1:I${debtRows.length}`,
    values: debtRows,
  });

  // 13. PATRIMÔNIO
  const patRows = [
    ['ID', 'Tipo', 'Subtipo', 'Descrição', 'Valor Avaliação', 'Data Avaliação'],
    ...data.patrimony.map((p) => [
      p.id,
      p.tipo,
      p.subtipo,
      p.descricao,
      formatCurrency(p.valorAvaliacaoCentavos),
      formatDateBR(p.dataAvaliacao),
    ]),
  ];
  valueRanges.push({
    range: `'PATRIMÔNIO'!A1:F${patRows.length}`,
    values: patRows,
  });

  // 14. INVESTIMENTOS
  const invstRows = [
    ['ID', 'Instituição', 'Produto', 'Categoria', 'Valor Investido', 'Saldo Atual', 'Rentabilidade'],
    ...data.investments.map((inv) => [
      inv.id,
      inv.instituicao,
      inv.produto,
      inv.categoria,
      formatCurrency(inv.valorInvestidoCentavos),
      formatCurrency(inv.saldoAtualCentavos),
      `${inv.rentabilidadeHistoricaPercentual}%`,
    ]),
  ];
  valueRanges.push({
    range: `'INVESTIMENTOS'!A1:G${invstRows.length}`,
    values: invstRows,
  });

  // 15. METAS
  const goalRows = [
    ['ID', 'Nome', 'Valor Alvo', 'Acumulado', 'Prazo', 'Prioridade', 'Aporte Mensal'],
    ...data.goals.map((g) => [
      g.id,
      g.nome,
      formatCurrency(g.valorAlvoCentavos),
      formatCurrency(g.valorAcumuladoCentavos),
      formatDateBR(g.prazo),
      g.prioridade,
      formatCurrency(g.aporteMensalCentavos),
    ]),
  ];
  valueRanges.push({
    range: `'METAS'!A1:G${goalRows.length}`,
    values: goalRows,
  });

  // 16. AUDITORIA
  const audRows = [
    ['ID', 'Timestamp', 'Usuário', 'Ação', 'Entidade', 'Registro ID', 'Motivo'],
    ...data.audit.slice(0, 50).map((a) => [
      a.id,
      a.timestamp,
      a.usuario,
      a.acao,
      a.entidade,
      a.registroId,
      a.motivo,
    ]),
  ];
  valueRanges.push({
    range: `'AUDITORIA'!A1:G${audRows.length}`,
    values: audRows,
  });


  // 17. PLANEJAMENTO — budget vs. realized expenses for the reference year.
  const categoriesById = new Map(data.categories.map((category) => [category.id, category.nome]));
  const planningRows = [
    ['ID', 'Competência', 'Categoria', 'Valor Planejado', 'Valor Realizado', 'Diferença', 'Status', 'Observações'],
    ...data.budgets.map((budget) => {
      const realized = data.transactions
        .filter((tx) => !tx.isDeleted && tx.tipo === 'DESPESA' && tx.status === 'REALIZADO' && tx.categoriaId === budget.categoriaId && tx.competencia === budget.competencia)
        .reduce((sum, tx) => sum + tx.valorCentavos, 0);
      const difference = budget.valorPlanejadoCentavos - realized;
      return [budget.id, budget.competencia, categoriesById.get(budget.categoriaId) || budget.categoriaId,
        formatCurrency(budget.valorPlanejadoCentavos), formatCurrency(realized), formatCurrency(difference),
        difference < 0 ? 'ACIMA DO ORÇAMENTO' : difference === 0 ? 'NO LIMITE' : 'DENTRO DO ORÇAMENTO', ''];
    }),
  ];
  valueRanges.push({ range: `'PLANEJAMENTO'!A1:H${planningRows.length}`, values: planningRows });

  // Monthly source data used consistently by the twelve month tabs and annual summaries.
  const referenceYear = data.settings.anoReferencia;
  const monthNames = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const monthlyMetrics = monthNames.map((name, index) => {
    const competencia = `${referenceYear}-${String(index + 1).padStart(2, '0')}`;
    const monthTransactions = data.transactions.filter((tx) => !tx.isDeleted && tx.competencia === competencia);
    const receitas = monthTransactions.filter((tx) => tx.tipo === 'RECEITA' && tx.status === 'REALIZADO').reduce((sum, tx) => sum + tx.valorCentavos, 0);
    const despesas = monthTransactions.filter((tx) => tx.tipo === 'DESPESA' && tx.status === 'REALIZADO').reduce((sum, tx) => sum + tx.valorCentavos, 0);
    const amortizacoes = monthTransactions.filter((tx) => tx.tipo === 'AMORTIZACAO' && tx.status === 'REALIZADO').reduce((sum, tx) => sum + tx.valorCentavos, 0);
    const lastDay = new Date(referenceYear, index + 1, 0).getDate();
    const firstDay = `${competencia}-01`;
    const lastDate = `${competencia}-${String(lastDay).padStart(2, '0')}`;
    const previousDate = new Date(referenceYear, index, 0);
    const previousCompetencia = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    const previousLastDay = new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, 0).getDate();
    const openingDate = `${previousCompetencia}-${String(previousLastDay).padStart(2, '0')}`;
    const openingBalance = data.accounts.filter((account) => account.ativo).reduce((sum, account) =>
      sum + calculateAccountBalance(account, data.transactions.filter((tx) => tx.data <= openingDate)), 0);
    const closingBalance = data.accounts.filter((account) => account.ativo).reduce((sum, account) =>
      sum + calculateAccountBalance(account, data.transactions.filter((tx) => tx.data <= lastDate)), 0);
    return { name, competencia, transactions: monthTransactions, receitas, despesas, amortizacoes,
      resultado: receitas - despesas, openingBalance, closingBalance, firstDay, lastDate };
  });

  // 18. RELATÓRIOS — monthly operating indicators.
  const reportRows = [
    ['Relatório', 'Período', 'Indicador', 'Valor', 'Comparativo', 'Atualizado em'],
    ...monthlyMetrics.flatMap((month) => [
      ['Fluxo mensal', month.competencia, 'Receitas realizadas', formatCurrency(month.receitas), '', ''],
      ['Fluxo mensal', month.competencia, 'Despesas realizadas', formatCurrency(month.despesas), '', ''],
      ['Fluxo mensal', month.competencia, 'Amortização de principal', formatCurrency(month.amortizacoes), '', ''],
      ['Fluxo mensal', month.competencia, 'Resultado operacional', formatCurrency(month.resultado), '', ''],
    ]),
  ];
  valueRanges.push({ range: `'RELATÓRIOS'!A1:F${reportRows.length}`, values: reportRows });

  // 19–30. JANUARY–DECEMBER — all non-deleted entries by competence.
  monthlyMetrics.forEach((month) => {
    const rows = [
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
      ...month.transactions.map((tx) => {
        const accountOrCard = data.accounts.find((account) => account.id === tx.contaId)?.nome ||
          data.cards.find((card) => card.id === tx.cartaoId)?.nome || '';
        return [formatDateBR(tx.data), tx.descricao, categoriesById.get(tx.categoriaId) || tx.categoriaId,
          tx.tipo, accountOrCard, formatCurrency(tx.valorCentavos), tx.status, tx.competencia];
      }),
    ];
    valueRanges.push({ range: `'${month.name}'!A1:H${rows.length}`, values: rows });
  });

  // 31. CONSOLIDAÇÃO — historical account balances are calculated only through each month-end.
  const consolidationRows = [
    ['Competência', 'Entradas', 'Saídas', 'Resultado', 'Saldo Inicial', 'Saldo Final'],
    ...monthlyMetrics.map((month) => [month.competencia, formatCurrency(month.receitas),
      formatCurrency(month.despesas), formatCurrency(month.resultado),
      formatCurrency(month.openingBalance), formatCurrency(month.closingBalance)]),
  ];
  valueRanges.push({ range: `'CONSOLIDAÇÃO'!A1:F${consolidationRows.length}`, values: consolidationRows });

  // 32. COMPARATIVO — selected month against the immediately preceding month.
  const selectedIndex = Math.min(12, Math.max(1, data.settings.mesReferencia)) - 1;
  const currentMonth = monthlyMetrics[selectedIndex];
  const previousMonth = selectedIndex === 0
    ? null
    : monthlyMetrics[selectedIndex - 1];
  const comparisonMetrics = [
    ['Receitas realizadas', currentMonth.receitas, previousMonth?.receitas ?? 0],
    ['Despesas realizadas', currentMonth.despesas, previousMonth?.despesas ?? 0],
    ['Resultado operacional', currentMonth.resultado, previousMonth?.resultado ?? 0],
    ['Amortização de principal', currentMonth.amortizacoes, previousMonth?.amortizacoes ?? 0],
  ];
  const comparisonRows = [
    ['Indicador', 'Mês Atual', 'Mês Anterior', 'Variação', 'Variação %'],
    ...comparisonMetrics.map(([label, current, previous]) => {
      const currentValue = Number(current);
      const previousValue = Number(previous);
      const variation = currentValue - previousValue;
      return [String(label), formatCurrency(currentValue), previousMonth ? formatCurrency(previousValue) : 'N/D',
        formatCurrency(variation), previousMonth && previousValue !== 0 ? `${((variation / Math.abs(previousValue)) * 100).toFixed(1)}%` : 'N/D'];
    }),
  ];
  valueRanges.push({ range: `'COMPARATIVO'!A1:E${comparisonRows.length}`, values: comparisonRows });

  // 33. INDICADORES ANUAIS — monthly series and annual totals.
  const annualRows = [
    ['Indicador', ...monthNames, 'Total Anual'],
    ...[
      ['Receitas realizadas', monthlyMetrics.map((month) => month.receitas)],
      ['Despesas realizadas', monthlyMetrics.map((month) => month.despesas)],
      ['Resultado operacional', monthlyMetrics.map((month) => month.resultado)],
      ['Amortização de principal', monthlyMetrics.map((month) => month.amortizacoes)],
    ].map(([label, values]) => {
      const amounts = values as number[];
      return [String(label), ...amounts.map((amount) => formatCurrency(amount)), formatCurrency(amounts.reduce((sum, amount) => sum + amount, 0))];
    }),
  ];
  valueRanges.push({ range: `'INDICADORES ANUAIS'!A1:N${annualRows.length}`, values: annualRows });

  // Ensure every one of the 32 tabs has a meaningful header row.
  // Existing populated tabs keep their own data/header rows; only missing tabs receive defaults.
  const headersBySheet: Record<string, string[]> = {
    'CONFIGURAÇÕES': ['Parâmetro', 'Valor'],
    'CADASTROS': ['Entidade', 'Tipo', 'Identificador', 'Descrição'],
    'CONTAS': ['ID', 'Nome', 'Instituição', 'Tipo', 'Saldo Inicial', 'Data Inicial', 'Saldo Calculado', 'Situação', 'Observações'],
    'LANÇAMENTOS': ['ID', 'Data', 'Competência', 'Descrição', 'Tipo', 'Categoria ID', 'Conta ID', 'Cartão ID', 'Forma Pagamento', 'Valor', 'Status', 'Origem', 'Observações'],
    'CARTÕES': ['ID', 'Nome', 'Instituição', 'Bandeira', 'Limite Total', 'Dia Fechamento', 'Dia Vencimento', 'Situação'],
    'FATURAS': ['ID', 'Cartão ID', 'Competência', 'Fechamento', 'Vencimento', 'Valor Total', 'Valor Pago', 'Saldo Restante', 'Status'],
    'PARCELAMENTOS': ['ID', 'Descrição', 'Valor Total', 'Total Parcelas', 'Valor Parcela', 'Data Compra', 'Pagas', 'Futuras', 'Saldo Restante'],
    'RECORRÊNCIAS': ['ID', 'Descrição', 'Valor', 'Tipo', 'Frequência', 'Dia Vencimento', 'Categoria', 'Ativo'],
    'CATEGORIAS': ['ID', 'Nome', 'Tipo', 'Limite Mensal', 'É Grana Extra'],
    'ORÇAMENTO': ['ID', 'Competência', 'Categoria ID', 'Valor Planejado', 'Alerta %'],
    'PLANEJAMENTO': ['ID', 'Competência', 'Categoria', 'Valor Planejado', 'Valor Realizado', 'Diferença', 'Status', 'Observações'],
    'DÍVIDAS': ['ID', 'Credor', 'Tipo', 'Principal', 'Saldo Devedor', 'Juros a.m.', 'Parcelas Restantes', 'Valor Parcela', 'Status'],
    'PATRIMÔNIO': ['ID', 'Tipo', 'Subtipo', 'Descrição', 'Valor Avaliação', 'Data Avaliação'],
    'INVESTIMENTOS': ['ID', 'Instituição', 'Produto', 'Categoria', 'Valor Investido', 'Saldo Atual', 'Rentabilidade'],
    'METAS': ['ID', 'Nome', 'Valor Alvo', 'Acumulado', 'Prazo', 'Prioridade', 'Aporte Mensal'],
    'AUDITORIA': ['ID', 'Timestamp', 'Usuário', 'Ação', 'Entidade', 'Registro ID', 'Motivo'],
    'RELATÓRIOS': ['Relatório', 'Período', 'Indicador', 'Valor', 'Comparativo', 'Atualizado em'],
    'JANEIRO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'FEVEREIRO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'MARÇO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'ABRIL': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'MAIO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'JUNHO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'JULHO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'AGOSTO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'SETEMBRO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'OUTUBRO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'NOVEMBRO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'DEZEMBRO': ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta / Cartão', 'Valor', 'Status', 'Competência'],
    'CONSOLIDAÇÃO': ['Competência', 'Entradas', 'Saídas', 'Resultado', 'Saldo Inicial', 'Saldo Final'],
    'COMPARATIVO': ['Indicador', 'Mês Atual', 'Mês Anterior', 'Variação', 'Variação %'],
    'INDICADORES ANUAIS': ['Indicador', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Total Anual'],
  };

  const alreadyWrittenSheets = new Set(
    valueRanges.map((item) => item.range.match(/^'(.+)'!/)?.[1]).filter(Boolean) as string[]
  );
  for (const sheetName of ALL_32_SHEET_NAMES) {
    if (alreadyWrittenSheets.has(sheetName)) continue;
    const headers = headersBySheet[sheetName];
    if (!headers) throw new Error(`Cabeçalhos não definidos para a aba ${sheetName}`);
    const lastColumn = String.fromCharCode(64 + headers.length);
    valueRanges.push({ range: `'${sheetName}'!A1:${lastColumn}1`, values: [headers] });
  }

  // Write current values first, then clear stale rows left by older/larger exports.
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Falha ao sincronizar com Google Sheets: ${err.error?.message || res.statusText}`);
  }

  const staleRanges = valueRanges.flatMap((item) => {
    const match = item.range.match(/^'(.+)'!A1:[A-Z]+(\d+)$/);
    if (!match) return [];
    const sheetName = match[1];
    const lastWrittenRow = Number(match[2]);
    return lastWrittenRow < 500 ? [`'${sheetName}'!A${lastWrittenRow + 1}:T500`] : [];
  });
  if (staleRanges.length > 0) {
    const clearResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ranges: staleRanges }),
    });
    if (!clearResponse.ok) {
      const error = await clearResponse.json();
      throw new Error(`Dados sincronizados, mas não foi possível limpar linhas antigas: ${error.error?.message || clearResponse.statusText}`);
    }
  }

  await applyProfessionalSpreadsheetDesign(spreadsheetId, token, valueRanges);
}


/** Applies FinanceCap formatting without changing financial values or calculations. */
async function applyProfessionalSpreadsheetDesign(
  spreadsheetId: string,
  token: string,
  valueRanges: Array<{ range: string; values: (string | number)[][] }>
): Promise<void> {
  const headersBySheet = new Map<string, (string | number)[]>();
  const rowCountBySheet = new Map<string, number>();

  for (const item of valueRanges) {
    const match = item.range.match(/^'(.+)'!/);
    if (!match) continue;
    headersBySheet.set(match[1], item.values[0] || []);
    rowCountBySheet.set(match[1], item.values.length);
  }

  const requests: Record<string, unknown>[] = [];
  const navy = { red: 11 / 255, green: 37 / 255, blue: 69 / 255 };
  const white = { red: 1, green: 1, blue: 1 };
  const ink = { red: 31 / 255, green: 41 / 255, blue: 55 / 255 };
  const softBackground = { red: 248 / 255, green: 250 / 255, blue: 253 / 255 };

  ALL_32_SHEET_NAMES.forEach((sheetName, index) => {
    const sheetId = index + 100;
    const headers = headersBySheet.get(sheetName) || [];
    const populatedRows = rowCountBySheet.get(sheetName) || 1;
    const columnCount = Math.max(1, headers.length);

    requests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1, hideGridlines: true } },
        fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines',
      },
    });
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
        cell: {
          userEnteredFormat: {
            backgroundColor: navy,
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
            textFormat: { foregroundColor: white, bold: true, fontFamily: 'Arial', fontSize: 10 },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)',
      },
    });
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 0, endColumnIndex: 20 },
        cell: {
          userEnteredFormat: {
            backgroundColor: softBackground,
            verticalAlignment: 'MIDDLE',
            textFormat: { foregroundColor: ink, fontFamily: 'Arial', fontSize: 10 },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,verticalAlignment,textFormat)',
      },
    });
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 42 },
        fields: 'pixelSize',
      },
    });
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 20 },
        properties: { pixelSize: 140 },
        fields: 'pixelSize',
      },
    });

    headers.forEach((header, columnIndex) => {
      const label = String(header).toLocaleLowerCase('pt-BR');
      let width = 140;
      if (/descrição|observações|motivo|entidade|produto|instituição|relatório/.test(label)) width = 230;
      else if (/id|identificador/.test(label)) width = 170;
      else if (/data|competência|prazo|timestamp/.test(label)) width = 135;
      else if (/valor|saldo|limite|principal|parcela|entrada|saída|resultado/.test(label)) width = 155;

      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: columnIndex, endIndex: columnIndex + 1 },
          properties: { pixelSize: width },
          fields: 'pixelSize',
        },
      });
    });

    requests.push({ clearBasicFilter: { sheetId } });
    if (populatedRows > 1) {
      requests.push({
        setBasicFilter: {
          filter: {
            range: { sheetId, startRowIndex: 0, endRowIndex: populatedRows, startColumnIndex: 0, endColumnIndex: columnCount },
          },
        },
      });
    }
  });

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Os dados foram sincronizados, mas o layout não pôde ser aplicado: ${error.error?.message || response.statusText}`);
  }
}
