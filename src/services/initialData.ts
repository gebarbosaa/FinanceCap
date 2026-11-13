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
import { getCurrentCompetencia, getCurrentDateISO } from './currency';

export const INITIAL_SETTINGS: SystemSettings = {
  nomeSistema: 'FINANCEIRO BARBOSA FERNANDES',
  nomeProprietario: 'Barbosa Fernandes',
  moeda: 'BRL',
  idioma: 'pt-BR',
  fusoHorario: 'America/Sao_Paulo',
  anoReferencia: 2026,
  mesReferencia: 11,
  reservaEmergenciaMetaCentavos: 9000000, // R$ 90.000,00
  alertaVencimentoDias: 5,
  autoBackupDrive: true,
  waterGoalMl: 2000,
};

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-itau-01',
    nome: 'Itaú Personnalité',
    instituicao: 'Itaú Unibanco',
    tipo: 'CONTA_CORRENTE',
    saldoInicialCentavos: 2845000, // R$ 28.450,00
    dataSaldoInicial: '2026-01-01',
    cor: '#EC7000',
    ativo: true,
    observacoes: 'Conta principal movimentação e recebimento de pró-labore',
  },
  {
    id: 'acc-nubank-02',
    nome: 'Nubank Ultravioleta',
    instituicao: 'Nu Pagamentos',
    tipo: 'CARTEIRA_DIGITAL',
    saldoInicialCentavos: 1238000, // R$ 12.380,00
    dataSaldoInicial: '2026-01-01',
    cor: '#820AD1',
    ativo: true,
    observacoes: 'Conta de despesas do dia a dia e rendimento automático',
  },
  {
    id: 'acc-xp-03',
    nome: 'XP Investimentos',
    instituicao: 'XP Investimentos',
    tipo: 'INVESTIMENTO',
    saldoInicialCentavos: 5200000, // R$ 52.000,00 saldo em conta de investimento
    dataSaldoInicial: '2026-01-01',
    cor: '#1A1A1A',
    ativo: true,
    observacoes: 'Conta de custódia e aportes mensais',
  },
  {
    id: 'acc-reserva-04',
    nome: 'Reserva de Liquidez Diária',
    instituicao: 'Itaú / Tesouro Selic',
    tipo: 'RESERVA',
    saldoInicialCentavos: 6500000, // R$ 65.000,00
    dataSaldoInicial: '2026-01-01',
    cor: '#1F4E79',
    ativo: true,
    observacoes: 'Reserva de emergência blindada com liquidez imediata',
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Receitas
  { id: 'cat-rec-01', nome: 'Pró-Labore & Salário', tipo: 'RECEITA', icone: 'Briefcase', cor: '#10B981' },
  { id: 'cat-rec-02', nome: 'Distribuição de Lucros', tipo: 'RECEITA', icone: 'TrendingUp', cor: '#059669' },
  { id: 'cat-rec-03', nome: 'Rendimentos & Dividendos', tipo: 'RECEITA', icone: 'PiggyBank', cor: '#34D399' },
  { id: 'cat-rec-04', nome: 'Consultorias & Serviços', tipo: 'RECEITA', icone: 'Laptop', cor: '#047857' },
  { id: 'cat-rec-05', nome: 'Reembolsos & Estornos', tipo: 'RECEITA', icone: 'RotateCcw', cor: '#6EE7B7' },
  { id: 'cat-rec-06', nome: 'GRANA EXTRA', tipo: 'RECEITA', icone: 'Sparkles', cor: '#F59E0B', isGranaExtra: true },

  // Despesas
  { id: 'cat-desp-01', nome: 'Moradia & Condomínio', tipo: 'DESPESA', icone: 'Home', cor: '#3B82F6', limiteMensalCentavos: 550000 },
  { id: 'cat-desp-02', nome: 'Alimentação & Supermercado', tipo: 'DESPESA', icone: 'ShoppingCart', cor: '#EC4899', limiteMensalCentavos: 380000 },
  { id: 'cat-desp-03', nome: 'Transporte & Combustível', tipo: 'DESPESA', icone: 'Car', cor: '#8B5CF6', limiteMensalCentavos: 180000 },
  { id: 'cat-desp-04', nome: 'Saúde & Cuidados', tipo: 'DESPESA', icone: 'HeartPulse', cor: '#EF4444', limiteMensalCentavos: 220000 },
  { id: 'cat-desp-05', nome: 'Educação & Livros', tipo: 'DESPESA', icone: 'GraduationCap', cor: '#F97316', limiteMensalCentavos: 150000 },
  { id: 'cat-desp-06', nome: 'Lazer & Restaurantes', tipo: 'DESPESA', icone: 'UtensilsCrossed', cor: '#14B8A6', limiteMensalCentavos: 250000 },
  { id: 'cat-desp-07', nome: 'Assinaturas & Telecom', tipo: 'DESPESA', icone: 'Tv', cor: '#6366F1', limiteMensalCentavos: 80000 },
  { id: 'cat-desp-08', nome: 'Compras & Vestuário', tipo: 'DESPESA', icone: 'ShoppingBag', cor: '#A855F7', limiteMensalCentavos: 160000 },
  { id: 'cat-desp-09', nome: 'Impostos & Tarifas', tipo: 'DESPESA', icone: 'Receipt', cor: '#64748B', limiteMensalCentavos: 120000 },
  { id: 'cat-desp-10', nome: 'Manutenção & Serviços', tipo: 'DESPESA', icone: 'Wrench', cor: '#78716C', limiteMensalCentavos: 100000 },
  { id: 'cat-desp-11', nome: 'GRANA EXTRA', tipo: 'DESPESA', icone: 'Flame', cor: '#D97706', limiteMensalCentavos: 300000, isGranaExtra: true },
  { id: 'cat-desp-12', nome: 'Outros & Diversos', tipo: 'DESPESA', icone: 'MoreHorizontal', cor: '#94A3B8', limiteMensalCentavos: 100000 },
];

export const INITIAL_CARDS: CreditCard[] = [
  {
    id: 'card-black-01',
    nome: 'Itaú Personnalité Black',
    instituicao: 'Itaú Unibanco',
    bandeira: 'MASTERCARD',
    limiteTotalCentavos: 4500000, // R$ 45.000,00
    diaFechamento: 20,
    diaVencimento: 28,
    contaPagamentoId: 'acc-itau-01',
    cor: '#0B2545',
    ativo: true,
  },
  {
    id: 'card-nubank-02',
    nome: 'Nubank Ultravioleta',
    instituicao: 'Nubank',
    bandeira: 'MASTERCARD',
    limiteTotalCentavos: 2500000, // R$ 25.000,00
    diaFechamento: 5,
    diaVencimento: 12,
    contaPagamentoId: 'acc-nubank-02',
    cor: '#820AD1',
    ativo: true,
  },
];

export const INITIAL_RECURRENCES: Recurrence[] = [
  {
    id: 'rec-salario-01',
    descricao: 'Pró-Labore Barbosa Fernandes',
    valorCentavos: 2500000, // R$ 25.000,00
    tipo: 'RECEITA',
    frequencia: 'MENSAL',
    diaVencimento: 5,
    categoriaId: 'cat-rec-01',
    contaId: 'acc-itau-01',
    ativo: true,
    ultimaGeracaoCompetencia: '2026-11',
    idempotencyHash: 'prolabore-mensal-5',
  },
  {
    id: 'rec-aluguel-02',
    descricao: 'Condomínio e IPTU Residencial',
    valorCentavos: 285000, // R$ 2.850,00
    tipo: 'DESPESA',
    frequencia: 'MENSAL',
    diaVencimento: 10,
    categoriaId: 'cat-desp-01',
    contaId: 'acc-itau-01',
    ativo: true,
    ultimaGeracaoCompetencia: '2026-11',
    idempotencyHash: 'condominio-mensal-10',
  },
  {
    id: 'rec-saude-03',
    descricao: 'Plano de Saúde Bradesco Top',
    valorCentavos: 148000, // R$ 1.480,00
    tipo: 'DESPESA',
    frequencia: 'MENSAL',
    diaVencimento: 15,
    categoriaId: 'cat-desp-04',
    contaId: 'acc-itau-01',
    ativo: true,
    ultimaGeracaoCompetencia: '2026-11',
    idempotencyHash: 'saude-mensal-15',
  },
  {
    id: 'rec-internet-04',
    descricao: 'Internet Vivo Fibra 600MB',
    valorCentavos: 19990, // R$ 199,90
    tipo: 'DESPESA',
    frequencia: 'MENSAL',
    diaVencimento: 20,
    categoriaId: 'cat-desp-07',
    cartaoId: 'card-nubank-02',
    ativo: true,
    ultimaGeracaoCompetencia: '2026-11',
    idempotencyHash: 'vivofibra-mensal-20',
  },
  {
    id: 'rec-energia-05',
    descricao: 'Energia Elétrica Enel',
    valorCentavos: 38000, // R$ 380,00
    tipo: 'DESPESA',
    frequencia: 'MENSAL',
    diaVencimento: 22,
    categoriaId: 'cat-desp-01',
    contaId: 'acc-nubank-02',
    ativo: true,
    ultimaGeracaoCompetencia: '2026-11',
    idempotencyHash: 'energia-mensal-22',
  },
];

export const INITIAL_INSTALLMENTS: InstallmentPlan[] = [
  {
    id: 'inst-01',
    descricao: 'Workstation Dell XPS Barbosa Fernandes',
    valorTotalCentavos: 980000, // R$ 9.800,00
    totalParcelas: 10,
    valorParcelaCentavos: 98000, // R$ 980,00
    dataCompra: '2026-06-15',
    primeiraCompetencia: '2026-07',
    cartaoId: 'card-black-01',
    parcelasPagas: 5,
    parcelasFuturas: 5,
    saldoRestanteCentavos: 490000, // R$ 4.900,00
  },
  {
    id: 'inst-02',
    descricao: 'Reforma e Mobiliário Escritório',
    valorTotalCentavos: 870000, // R$ 8.700,00
    totalParcelas: 6,
    valorParcelaCentavos: 145000, // R$ 1.450,00
    dataCompra: '2026-09-10',
    primeiraCompetencia: '2026-10',
    cartaoId: 'card-black-01',
    parcelasPagas: 2,
    parcelasFuturas: 4,
    saldoRestanteCentavos: 580000, // R$ 5.800,00
  },
];

export const INITIAL_DEBTS: Debt[] = [
  {
    id: 'debt-01',
    credor: 'Caixa Econômica Federal',
    tipo: 'FINANCIAMENTO_IMOBILIARIO',
    principalContratadoCentavos: 42000000, // R$ 420.000,00
    saldoDevedorCentavos: 28540000, // R$ 285.400,00
    taxaJurosMensalPercentual: 0.79,
    cetAnualPercentual: 9.85,
    parcelasTotais: 360,
    parcelasRestantes: 242,
    valorParcelaCentavos: 312000, // R$ 3.120,00
    proximoVencimento: '2026-11-25',
    status: 'EM_DIA',
    observacoes: 'Amortizações extraordinárias anuais com FGTS/Lucros reduzem prazo',
  },
];

export const INITIAL_PATRIMONY: PatrimonyItem[] = [
  {
    id: 'pat-01',
    tipo: 'ATIVO',
    subtipo: 'IMOVEL',
    descricao: 'Apartamento Jardins - São Paulo/SP (124m²)',
    valorAvaliacaoCentavos: 85000000, // R$ 850.000,00
    dataAvaliacao: '2026-01-10',
    observacoes: 'Avaliação imobiliária atualizada',
  },
  {
    id: 'pat-02',
    tipo: 'ATIVO',
    subtipo: 'VEICULO',
    descricao: 'Toyota Corolla Cross Hybrid 2024',
    valorAvaliacaoCentavos: 16500000, // R$ 165.000,00
    dataAvaliacao: '2026-03-01',
    observacoes: 'Tabela FIPE',
  },
  {
    id: 'pat-03',
    tipo: 'PASSIVO',
    subtipo: 'DIVIDA_PESSOAL',
    descricao: 'Saldo Devedor Financiamento Caixa',
    valorAvaliacaoCentavos: 28540000, // R$ 285.400,00
    dataAvaliacao: '2026-11-01',
  },
];

export const INITIAL_INVESTMENTS: Investment[] = [
  {
    id: 'inv-01',
    instituicao: 'XP Investimentos',
    produto: 'Tesouro Selic 2029',
    categoria: 'TESOURO_DIRETO',
    dataAplicacao: '2024-05-10',
    valorInvestidoCentavos: 6000000, // R$ 60.000,00
    saldoAtualCentavos: 7150000, // R$ 71.500,00
    rentabilidadeHistoricaPercentual: 19.16,
    dataAtualizacao: '2026-11-10',
  },
  {
    id: 'inv-02',
    instituicao: 'XP Investimentos',
    produto: 'CDB Banco Master 122% CDI',
    categoria: 'RENDA_FIXA_CDB',
    dataAplicacao: '2025-02-15',
    valorInvestidoCentavos: 4000000, // R$ 40.000,00
    saldoAtualCentavos: 4890000, // R$ 48.900,00
    rentabilidadeHistoricaPercentual: 22.25,
    dataAtualizacao: '2026-11-10',
  },
  {
    id: 'inv-03',
    instituicao: 'XP Investimentos',
    produto: 'HGLG11 - CSHG Logística FII',
    categoria: 'FUNDOS_IMOBILIARIOS',
    dataAplicacao: '2025-06-20',
    valorInvestidoCentavos: 3500000, // R$ 35.000,00
    saldoAtualCentavos: 3780000, // R$ 37.800,00
    rentabilidadeHistoricaPercentual: 8.0,
    dataAtualizacao: '2026-11-10',
  },
];

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal-01',
    nome: 'Reserva Estratégica Barbosa Fernandes',
    descricao: '6 meses de custo fixo familiar em liquidez imediata',
    valorAlvoCentavos: 9000000, // R$ 90.000,00
    valorAcumuladoCentavos: 6500000, // R$ 65.000,00
    prazo: '2027-06-30',
    prioridade: 'ALTA',
    aporteMensalCentavos: 250000, // R$ 2.500,00
  },
  {
    id: 'goal-02',
    nome: 'Independência Financeira & Portfólio 1M',
    descricao: 'Patrimônio financeiro gerador de renda passiva',
    valorAlvoCentavos: 100000000, // R$ 1.000.000,00
    valorAcumuladoCentavos: 15820000, // R$ 158.200,00
    prazo: '2032-12-31',
    prioridade: 'ALTA',
    aporteMensalCentavos: 500000, // R$ 5.000,00
  },
  {
    id: 'goal-03',
    nome: 'Viagem de Férias Europa Familiar',
    descricao: 'Férias de 20 dias em família planejadas sem endividamento',
    valorAlvoCentavos: 3500000, // R$ 35.000,00
    valorAcumuladoCentavos: 2100000, // R$ 21.000,00
    prazo: '2027-07-15',
    prioridade: 'MEDIA',
    aporteMensalCentavos: 175000, // R$ 1.750,00
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Receita de Salário / Pró-labore
  {
    id: 'tx-202611-01',
    data: '2026-11-05',
    competencia: '2026-11',
    descricao: 'Pró-Labore Barbosa Fernandes',
    tipo: 'RECEITA',
    categoriaId: 'cat-rec-01',
    contaId: 'acc-itau-01',
    formaPagamento: 'PIX / TED',
    valorCentavos: 2500000, // R$ 25.000,00
    status: 'REALIZADO',
    origem: 'RECORRENCIA',
    createdAt: '2026-11-05T08:00:00Z',
    updatedAt: '2026-11-05T08:00:00Z',
  },
  // Receita Dividendos XP
  {
    id: 'tx-202611-02',
    data: '2026-11-10',
    competencia: '2026-11',
    descricao: 'Rendimento Dividendos HGLG11 / KNCR11',
    tipo: 'RECEITA',
    categoriaId: 'cat-rec-03',
    contaId: 'acc-xp-03',
    formaPagamento: 'Depósito em Conta',
    valorCentavos: 34500, // R$ 345,00
    status: 'REALIZADO',
    origem: 'MANUAL',
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
  },
  // Despesa Moradia
  {
    id: 'tx-202611-03',
    data: '2026-11-10',
    competencia: '2026-11',
    descricao: 'Condomínio Residencial Jardins',
    tipo: 'DESPESA',
    categoriaId: 'cat-desp-01',
    contaId: 'acc-itau-01',
    formaPagamento: 'Boleto Débito em Conta',
    valorCentavos: 285000, // R$ 2.850,00
    status: 'REALIZADO',
    origem: 'RECORRENCIA',
    createdAt: '2026-11-10T09:30:00Z',
    updatedAt: '2026-11-10T09:30:00Z',
  },
  // Despesa Supermercado (Cartão Black)
  {
    id: 'tx-202611-04',
    data: '2026-11-08',
    competencia: '2026-11',
    descricao: 'Supermercado Pão de Açúcar Jardins',
    tipo: 'DESPESA',
    categoriaId: 'cat-desp-02',
    cartaoId: 'card-black-01',
    formaPagamento: 'Cartão de Crédito',
    valorCentavos: 124000, // R$ 1.240,00
    status: 'REALIZADO',
    origem: 'MANUAL',
    createdAt: '2026-11-08T18:15:00Z',
    updatedAt: '2026-11-08T18:15:00Z',
  },
  // Parcela Workstation Dell no Cartão
  {
    id: 'tx-202611-05',
    data: '2026-11-15',
    competencia: '2026-11',
    descricao: 'Workstation Dell XPS Barbosa Fernandes (Parcela 5/10)',
    tipo: 'DESPESA',
    categoriaId: 'cat-desp-08',
    cartaoId: 'card-black-01',
    parcelamentoId: 'inst-01',
    parcelaNumero: 5,
    totalParcelas: 10,
    formaPagamento: 'Cartão de Crédito Parcelado',
    valorCentavos: 98000, // R$ 980,00
    status: 'REALIZADO',
    origem: 'PARCELAMENTO',
    createdAt: '2026-11-11T00:00:00Z',
    updatedAt: '2026-11-11T00:00:00Z',
  },
  // Parcela Reforma no Cartão
  {
    id: 'tx-202611-06',
    data: '2026-11-10',
    competencia: '2026-11',
    descricao: 'Reforma Escritório Barbosa Fernandes (Parcela 2/6)',
    tipo: 'DESPESA',
    categoriaId: 'cat-desp-10',
    cartaoId: 'card-black-01',
    parcelamentoId: 'inst-02',
    parcelaNumero: 2,
    totalParcelas: 6,
    formaPagamento: 'Cartão de Crédito Parcelado',
    valorCentavos: 145000, // R$ 1.450,00
    status: 'REALIZADO',
    origem: 'PARCELAMENTO',
    createdAt: '2026-11-11T00:00:00Z',
    updatedAt: '2026-11-11T00:00:00Z',
  },
  // Despesa GRANA EXTRA (Classificação especial: excluída do Top 15 maiores despesas)
  {
    id: 'tx-202611-07',
    data: '2026-11-06',
    competencia: '2026-11',
    descricao: 'Oportunidade Compra Equipamento Lote Especial',
    tipo: 'DESPESA',
    categoriaId: 'cat-desp-11',
    contaId: 'acc-itau-01',
    formaPagamento: 'PIX',
    valorCentavos: 250000, // R$ 2.500,00 (Grana Extra - Deve ficar FORA do ranking das 15 maiores despesas)
    status: 'REALIZADO',
    observacoes: 'Classificada como GRANA EXTRA: excluída por regra do proprietário do ranking top 15',
    origem: 'MANUAL',
    createdAt: '2026-11-06T14:00:00Z',
    updatedAt: '2026-11-06T14:00:00Z',
  },
  // Transferência entre contas (Itaú para Nubank - NÃO PODE GERAR RECEITA OU DESPESA)
  {
    id: 'tx-202611-08',
    data: '2026-11-07',
    competencia: '2026-11',
    descricao: 'Transferência para despesas cotidianas Nubank',
    tipo: 'TRANSFERENCIA',
    categoriaId: 'cat-desp-12',
    contaId: 'acc-itau-01',
    contaDestinoId: 'acc-nubank-02',
    formaPagamento: 'PIX Entre Mesma Titularidade',
    valorCentavos: 300000, // R$ 3.000,00
    status: 'REALIZADO',
    observacoes: 'Transferência neutra entre contas. Não duplica receitas nem despesas.',
    origem: 'MANUAL',
    createdAt: '2026-11-07T11:00:00Z',
    updatedAt: '2026-11-07T11:00:00Z',
  },
  // Despesa Restaurante Nubank
  {
    id: 'tx-202611-09',
    data: '2026-11-09',
    competencia: '2026-11',
    descricao: 'Restaurante Fogo de Chão Jardins',
    tipo: 'DESPESA',
    categoriaId: 'cat-desp-06',
    contaId: 'acc-nubank-02',
    formaPagamento: 'Débito Nubank',
    valorCentavos: 48000, // R$ 480,00
    status: 'REALIZADO',
    origem: 'MANUAL',
    createdAt: '2026-11-09T21:30:00Z',
    updatedAt: '2026-11-09T21:30:00Z',
  },
  // Despesa Pendente do mês
  {
    id: 'tx-202611-10',
    data: '2026-11-25',
    competencia: '2026-11',
    descricao: 'Financiamento Imobiliário Caixa - Parcela Mensal',
    tipo: 'DESPESA',
    categoriaId: 'cat-desp-09',
    contaId: 'acc-itau-01',
    formaPagamento: 'Débito Automático',
    valorCentavos: 312000, // R$ 3.120,00
    status: 'PENDENTE',
    origem: 'SISTEMA',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-card-black-202611',
    cartaoId: 'card-black-01',
    competencia: '2026-11',
    dataFechamento: '2026-11-20',
    dataVencimento: '2026-11-28',
    valorTotalCentavos: 367000, // R$ 3.670,00 (inclui Supermercado + Parcelas Dell + Reforma)
    valorPagoCentavos: 0,
    saldoRestanteCentavos: 367000,
    status: 'ABERTA',
  },
  {
    id: 'inv-card-nubank-202611',
    cartaoId: 'card-nubank-02',
    competencia: '2026-11',
    dataFechamento: '2026-11-05',
    dataVencimento: '2026-11-12',
    valorTotalCentavos: 19990, // R$ 199,90 (Internet Fibra)
    valorPagoCentavos: 19990,
    saldoRestanteCentavos: 0,
    status: 'PAGA',
  },
];

export const INITIAL_BUDGETS: Budget[] = [
  { id: 'bgt-01', competencia: '2026-11', categoriaId: 'cat-desp-01', valorPlanejadoCentavos: 550000, alertaPercentual: 80 },
  { id: 'bgt-02', competencia: '2026-11', categoriaId: 'cat-desp-02', valorPlanejadoCentavos: 380000, alertaPercentual: 80 },
  { id: 'bgt-03', competencia: '2026-11', categoriaId: 'cat-desp-03', valorPlanejadoCentavos: 180000, alertaPercentual: 80 },
  { id: 'bgt-04', competencia: '2026-11', categoriaId: 'cat-desp-04', valorPlanejadoCentavos: 220000, alertaPercentual: 80 },
  { id: 'bgt-05', competencia: '2026-11', categoriaId: 'cat-desp-05', valorPlanejadoCentavos: 150000, alertaPercentual: 80 },
  { id: 'bgt-06', competencia: '2026-11', categoriaId: 'cat-desp-06', valorPlanejadoCentavos: 250000, alertaPercentual: 80 },
  { id: 'bgt-07', competencia: '2026-11', categoriaId: 'cat-desp-07', valorPlanejadoCentavos: 80000, alertaPercentual: 80 },
  { id: 'bgt-08', competencia: '2026-11', categoriaId: 'cat-desp-08', valorPlanejadoCentavos: 160000, alertaPercentual: 80 },
];

export const INITIAL_AUDIT: AuditLog[] = [
  {
    id: 'aud-01',
    timestamp: '2026-11-01T00:00:00Z',
    usuario: 'Barbosa Fernandes',
    acao: 'CRIAR',
    entidade: 'SISTEMA',
    registroId: 'sys-init',
    valorPosterior: 'Inicialização do BF Finance OS',
    motivo: 'Setup inicial da base financeira Barbosa Fernandes',
    origem: 'SISTEMA',
  },
];
