import test from 'node:test';
import assert from 'node:assert/strict';
import { parseToCentavos } from './currency';
import { calculateAccountBalance, calculateCardLimits } from './financeEngine';
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
    valorTotalCentavos: 200000,
    totalParcelas: 4,
    valorParcelaCentavos: 50000,
    dataCompra: '2026-09-10',
    primeiraCompetencia: '2026-10',
    cartaoId: card.id,
    parcelasPagas: 2,
    parcelasFuturas: 2,
    saldoRestanteCentavos: 100000,
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

  assert.equal(result.limiteUtilizadoCentavos, 160000);
  assert.equal(result.limiteDisponivelCentavos, 840000);
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
