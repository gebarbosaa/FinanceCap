import test from 'node:test';
import assert from 'node:assert/strict';
import { parseToCentavos } from './currency';
import { calculateAccountBalance, calculateCardLimits, calculateFinancialSummary } from './financeEngine';
import { runAll20MandatoryTests } from './testSuite';
import type { Account, CreditCard, Invoice, InstallmentPlan, Transaction } from '../types/finance';

test('parseToCentavos reads Brazilian thousands and decimal separators', () => {
  assert.equal(parseToCentavos('R$ 1.234,56'), 123456);
  assert.equal(parseToCentavos('1234,56'), 123456);
  assert.equal(parseToCentavos('1234.56'), 123456);
  assert.equal(parseToCentavos('1.234'), 123400);
  assert.equal(parseToCentavos('valor 12,34'), 0);
});

test('calculateAccountBalance ignores transactions before opening balance date', () => {
  const account: Account = {
    id: 'account-test',
    nome: 'Conta de teste',
    instituicao: 'Banco',
    tipo: 'CONTA_CORRENTE',
    saldoInicialCentavos: 100000,
    dataSaldoInicial: '2026-06-01',
    ativo: true,
  };
  const makeTransaction = (id: string, data: string, valorCentavos: number): Transaction => ({
    id,
    data,
    competencia: data.slice(0, 7),
    descricao: id,
    tipo: 'RECEITA',
    categoriaId: 'income',
    contaId: account.id,
    formaPagamento: 'PIX',
    valorCentavos,
    status: 'REALIZADO',
    origem: 'MANUAL',
    createdAt: data,
    updatedAt: data,
  });

  assert.equal(
    calculateAccountBalance(account, [
      makeTransaction('before-opening', '2026-05-31', 50000),
      makeTransaction('on-opening-date', '2026-06-01', 10000),
    ]),
    110000
  );
});

test('calculateCardLimits counts unpaid invoices once and releases paid invoices', () => {
  const card: CreditCard = {
    id: 'card-test',
    nome: 'Cartão teste',
    instituicao: 'Banco',
    bandeira: 'VISA',
    limiteTotalCentavos: 1000000,
    diaFechamento: 20,
    diaVencimento: 28,
    contaPagamentoId: 'account-test',
    cor: '#000000',
    ativo: true,
  };
  const makeTransaction = (id: string, competencia: string, valorCentavos: number): Transaction => ({
    id,
    data: `${competencia}-10`,
    competencia,
    descricao: id,
    tipo: 'DESPESA',
    categoriaId: 'expense',
    cartaoId: card.id,
    formaPagamento: 'Cartão de crédito',
    valorCentavos,
    status: 'REALIZADO',
    origem: 'MANUAL',
    createdAt: '2026-11-10T12:00:00.000Z',
    updatedAt: '2026-11-10T12:00:00.000Z',
  });
  const invoice = (id: string, competencia: string, saldo: number, status: Invoice['status']): Invoice => ({
    id,
    cartaoId: card.id,
    competencia,
    dataFechamento: `${competencia}-20`,
    dataVencimento: `${competencia}-28`,
    valorTotalCentavos: saldo,
    valorPagoCentavos: status === 'PAGA' ? saldo : 0,
    saldoRestanteCentavos: saldo,
    status,
  });
  const installment: InstallmentPlan = {
    id: 'installment-test',
    descricao: 'Compra parcelada',
    valorTotalCentavos: 250000,
    totalParcelas: 5,
    valorParcelaCentavos: 50000,
    dataCompra: '2026-09-10',
    primeiraCompetencia: '2026-10',
    cartaoId: card.id,
    parcelasPagas: 0,
    parcelasFuturas: 3,
    saldoRestanteCentavos: 150000,
  };

  const result = calculateCardLimits(
    card,
    [
      makeTransaction('paid-purchase', '2026-10', 50000),
      makeTransaction('open-invoice-purchase', '2026-11', 30000),
      makeTransaction('unbilled-purchase', '2026-12', 20000),
      makeTransaction('cancelled-invoice-purchase', '2027-01', 10000),
    ],
    [installment],
    [
      invoice('paid-invoice', '2026-10', 50000, 'PAGA'),
      invoice('open-invoice', '2026-11', 30000, 'ABERTA'),
      invoice('cancelled-invoice', '2027-01', 10000, 'CANCELADA'),
    ]
  );

  assert.equal(result.limiteUtilizadoCentavos, 110000);
  assert.equal(result.limiteDisponivelCentavos, 890000);
});

test('calculateCardLimits safely handles a zero credit limit', () => {
  const card: CreditCard = {
    id: 'zero-card',
    nome: 'Sem limite',
    instituicao: 'Banco',
    bandeira: 'VISA',
    limiteTotalCentavos: 0,
    diaFechamento: 20,
    diaVencimento: 28,
    contaPagamentoId: 'account-test',
    cor: '#000000',
    ativo: true,
  };
  const result = calculateCardLimits(card, [], []);
  assert.equal(result.limiteTotalCentavos, 0);
  assert.equal(result.limiteDisponivelCentavos, 0);
  assert.equal(Number.isFinite(result.limiteUtilizadoCentavos), true);
});

test('all 21 in-app business-rule checks pass', () => {
  const results = runAll20MandatoryTests();
  const failures = results.filter((result) => !result.aprovado);
  assert.equal(results.length, 21, 'the in-app test suite count should match its 21 checks');
  assert.deepEqual(
    failures.map((result) => ({ id: result.id, nome: result.nome, mensagem: result.mensagem })),
    []
  );
});

test('calculateFinancialSummary preserves a negative cash availability as a deficit', () => {
  const account: Account = {
    id: 'cash-account',
    nome: 'Conta principal',
    instituicao: 'Banco',
    tipo: 'CONTA_CORRENTE',
    saldoInicialCentavos: 10000,
    dataSaldoInicial: '2026-11-01',
    ativo: true,
  };
  const pendingExpense: Transaction = {
    id: 'pending-expense',
    data: '2026-11-12',
    competencia: '2026-11',
    descricao: 'Despesa pendente',
    tipo: 'DESPESA',
    categoriaId: 'expense',
    contaId: account.id,
    formaPagamento: 'PIX',
    valorCentavos: 20000,
    status: 'PENDENTE',
    origem: 'MANUAL',
    createdAt: '2026-11-12T12:00:00.000Z',
    updatedAt: '2026-11-12T12:00:00.000Z',
  };
  const summary = calculateFinancialSummary(
    [account], [], [pendingExpense], [], [], [], [], [],
    {
      nomeSistema: 'BF Finance OS',
      nomeProprietario: 'Teste',
      moeda: 'BRL',
      idioma: 'pt-BR',
      fusoHorario: 'America/Sao_Paulo',
      anoReferencia: 2026,
      mesReferencia: 11,
      reservaEmergenciaMetaCentavos: 0,
      alertaVencimentoDias: 5,
      autoBackupDrive: false,
    },
    '2026-11'
  );

  assert.equal(summary.dinheiroDisponivelGastarCentavos, -10000);
});


test('calculateCardLimits counts exact cent values for generated installment rows without duplicating the plan balance', () => {
  const card: CreditCard = {
    id: 'card-installment-remainder',
    nome: 'Cartão parcelado',
    instituicao: 'Banco',
    bandeira: 'VISA',
    limiteTotalCentavos: 100000,
    diaFechamento: 20,
    diaVencimento: 5,
    contaPagamentoId: 'account-test',
    cor: '#000000',
    ativo: true,
  };
  const plan: InstallmentPlan = {
    id: 'plan-remainder',
    descricao: 'Compra com centavos',
    valorTotalCentavos: 10001,
    totalParcelas: 3,
    valorParcelaCentavos: 3333,
    dataCompra: '2026-11-10',
    primeiraCompetencia: '2026-11',
    cartaoId: card.id,
    parcelasPagas: 0,
    parcelasFuturas: 3,
    saldoRestanteCentavos: 10001,
  };
  const rows: Transaction[] = [3334, 3334, 3333].map((amount, index) => ({
    id: `installment-row-${index + 1}`,
    data: '2026-11-10',
    competencia: `2026-${String(index + 11).padStart(2, '0')}`,
    descricao: `Compra (${index + 1}/3)`,
    tipo: 'DESPESA',
    categoriaId: 'expense',
    cartaoId: card.id,
    faturaId: `invoice-${index + 1}`,
    formaPagamento: 'CARTAO_CREDITO',
    valorCentavos: amount,
    status: 'PENDENTE',
    parcelamentoId: plan.id,
    parcelaNumero: index + 1,
    totalParcelas: 3,
    origem: 'PARCELAMENTO',
    createdAt: '2026-11-10T12:00:00.000Z',
    updatedAt: '2026-11-10T12:00:00.000Z',
  }));
  const invoices: Invoice[] = rows.map((row, index) => ({
    id: row.faturaId!,
    cartaoId: card.id,
    competencia: row.competencia,
    dataFechamento: `${row.competencia}-20`,
    dataVencimento: `${row.competencia}-28`,
    valorTotalCentavos: row.valorCentavos,
    valorPagoCentavos: 0,
    saldoRestanteCentavos: row.valorCentavos,
    status: 'ABERTA',
  }));

  const result = calculateCardLimits(card, rows, [plan], invoices);
  assert.equal(result.limiteUtilizadoCentavos, 10001);
  assert.equal(result.limiteDisponivelCentavos, 89999);
});
