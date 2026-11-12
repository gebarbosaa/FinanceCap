export type TransactionType = 
  | 'RECEITA' 
  | 'DESPESA' 
  | 'TRANSFERENCIA' 
  | 'AJUSTE' 
  | 'ESTORNO' 
  | 'LIQUIDACAO';

export type TransactionStatus = 
  | 'PREVISTO' 
  | 'PENDENTE' 
  | 'REALIZADO' 
  | 'CANCELADO' 
  | 'ESTORNADO';

export type AccountType = 
  | 'CONTA_CORRENTE' 
  | 'POUPANCA' 
  | 'CARTEIRA_DIGITAL' 
  | 'DINHEIRO' 
  | 'INVESTIMENTO' 
  | 'RESERVA';

export type CardFlag = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'OUTRA';

export type InvoiceStatus = 
  | 'ABERTA' 
  | 'FECHADA' 
  | 'PARCIALMENTE_PAGA' 
  | 'PAGA' 
  | 'VENCIDA' 
  | 'CANCELADA';

export type RecurrenceFrequency = 
  | 'DIARIA' 
  | 'SEMANAL' 
  | 'MENSAL' 
  | 'TRIMESTRAL' 
  | 'SEMESTRAL' 
  | 'ANUAL';

export type DebtType = 
  | 'FINANCIAMENTO_IMOBILIARIO' 
  | 'FINANCIAMENTO_VEICULO' 
  | 'EMPRESTIMO_PESSOAL' 
  | 'CONSIGNADO' 
  | 'DIVIDA_PESSOAL' 
  | 'OUTRO';

export type AssetType = 
  | 'IMOVEL' 
  | 'VEICULO' 
  | 'CONTA_BANCARIA' 
  | 'INVESTIMENTO' 
  | 'NEGOCIO' 
  | 'BENS_DIVERSOS'
  | 'DIVIDA_PESSOAL'
  | 'OUTRO_PASSIVO';

export type InvestmentCategory = 
  | 'RENDA_FIXA_CDB' 
  | 'TESOURO_DIRETO' 
  | 'LCI_LCA' 
  | 'ACOES' 
  | 'FUNDOS_IMOBILIARIOS' 
  | 'CRIPTO' 
  | 'PREVIDENCIA';

export interface Account {
  id: string;
  nome: string;
  instituicao: string;
  tipo: AccountType;
  saldoInicialCentavos: number; // in integer cents
  dataSaldoInicial: string; // YYYY-MM-DD
  cor?: string;
  ativo: boolean;
  observacoes?: string;
}

export interface Category {
  id: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  icone: string;
  cor: string;
  limiteMensalCentavos?: number;
  isGranaExtra?: boolean; // Excluded from top 15 expenses ranking
  ativo?: boolean; // Archived categories remain available for historical records
}

export interface CreditCard {
  id: string;
  nome: string;
  instituicao: string;
  bandeira: CardFlag;
  limiteTotalCentavos: number;
  diaFechamento: number; // 1-31
  diaVencimento: number; // 1-31
  contaPagamentoId: string;
  cor: string;
  ativo: boolean;
}

export interface Transaction {
  id: string;
  data: string; // YYYY-MM-DD
  competencia: string; // YYYY-MM
  descricao: string;
  tipo: TransactionType;
  categoriaId: string;
  subcategoria?: string;
  contaId?: string; // used if debit/credit to account
  contaDestinoId?: string; // for transferencias
  cartaoId?: string; // used if card purchase
  faturaId?: string;
  formaPagamento: string;
  valorCentavos: number; // strictly positive integer cents
  status: TransactionStatus;
  recorrenciaId?: string;
  parcelamentoId?: string;
  parcelaNumero?: number;
  totalParcelas?: number;
  observacoes?: string;
  origem: 'MANUAL' | 'CSV_IMPORT' | 'RECORRENCIA' | 'PARCELAMENTO' | 'SISTEMA';
  idExterno?: string;
  isDeleted?: boolean; // logical deletion
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  cartaoId: string;
  competencia: string; // YYYY-MM
  dataFechamento: string; // YYYY-MM-DD
  dataVencimento: string; // YYYY-MM-DD
  valorTotalCentavos: number;
  valorPagoCentavos: number;
  saldoRestanteCentavos: number;
  status: InvoiceStatus;
  pagamentoTransacaoId?: string;
}

export interface InstallmentPlan {
  id: string;
  compraTransacaoId?: string;
  descricao: string;
  valorTotalCentavos: number;
  totalParcelas: number;
  valorParcelaCentavos: number;
  dataCompra: string;
  primeiraCompetencia: string;
  cartaoId?: string;
  contaId?: string;
  parcelasPagas: number;
  parcelasFuturas: number;
  saldoRestanteCentavos: number;
}

export interface Recurrence {
  id: string;
  descricao: string;
  valorCentavos: number;
  tipo: 'RECEITA' | 'DESPESA';
  frequencia: RecurrenceFrequency;
  diaVencimento: number;
  categoriaId: string;
  contaId?: string;
  cartaoId?: string;
  ativo: boolean;
  ultimaGeracaoCompetencia?: string;
  idempotencyHash: string;
}

export interface Budget {
  id: string;
  competencia: string; // YYYY-MM
  categoriaId: string;
  valorPlanejadoCentavos: number;
  alertaPercentual: number; // default 80%
}

export interface Debt {
  id: string;
  credor: string;
  tipo: DebtType;
  principalContratadoCentavos: number;
  saldoDevedorCentavos: number;
  taxaJurosMensalPercentual: number;
  cetAnualPercentual?: number;
  parcelasTotais: number;
  parcelasRestantes: number;
  valorParcelaCentavos: number;
  proximoVencimento: string;
  status: 'EM_DIA' | 'QUITADO' | 'ATRASADO';
  observacoes?: string;
}

export interface PatrimonyItem {
  id: string;
  tipo: 'ATIVO' | 'PASSIVO';
  subtipo: AssetType;
  descricao: string;
  valorAvaliacaoCentavos: number;
  dataAvaliacao: string;
  observacoes?: string;
}

export interface Investment {
  id: string;
  instituicao: string;
  produto: string;
  categoria: InvestmentCategory;
  dataAplicacao: string;
  valorInvestidoCentavos: number;
  saldoAtualCentavos: number;
  rentabilidadeHistoricaPercentual: number;
  dataAtualizacao: string;
}

export interface Goal {
  id: string;
  nome: string;
  descricao?: string;
  valorAlvoCentavos: number;
  valorAcumuladoCentavos: number;
  prazo: string; // YYYY-MM-DD
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
  aporteMensalCentavos: number;
  categoriaId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  usuario: string;
  acao: 'CRIAR' | 'EDITAR' | 'EXCLUIR_LOGICA' | 'ESTORNAR' | 'CONCILIAR' | 'PAGAMENTO_FATURA';
  entidade: string;
  registroId: string;
  valorAnterior?: string;
  valorPosterior?: string;
  motivo: string;
  origem: string;
}

export interface SystemSettings {
  nomeSistema: string;
  nomeProprietario: string;
  moeda: string; // BRL
  idioma: string; // pt-BR
  fusoHorario: string; // America/Sao_Paulo
  anoReferencia: number;
  mesReferencia: number; // 1-12
  reservaEmergenciaMetaCentavos: number;
  alertaVencimentoDias: number;
  autoBackupDrive: boolean;
  sheetsSpreadsheetId?: string;
  sheetsSpreadsheetUrl?: string;
  lastSheetsSync?: string;
}

export interface FinancialSummary {
  saldoTotalBancosCentavos: number;
  saldoContasOperacionaisCentavos: number;
  dinheiroDisponivelGastarCentavos: number;
  receitasMesCentavos: number;
  receitasPrevistasMesCentavos: number;
  despesasMesCentavos: number;
  despesasPendentesMesCentavos: number;
  faturasAbertasCentavos: number;
  compromissosFuturosCentavos: number;
  patrimonioLiquidoCentavos: number;
  totalAtivosCentavos: number;
  totalPassivosCentavos: number;
  totalDividasCentavos: number;
  limiteTotalCartoesCentavos: number;
  limiteUtilizadoCartoesCentavos: number;
  limiteDisponivelCartoesCentavos: number;
}
