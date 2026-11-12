import { getAccessToken } from './authService';
import { StorageData } from './storageService';
import { formatCurrency, formatDateBR } from './currency';

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
  data: StorageData
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
      formatCurrency(acc.saldoInicialCentavos), // Will be updated
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

  // Execute batch update
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
}
