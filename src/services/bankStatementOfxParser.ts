import type { BankStatementParseResult, BankStatementRow } from './bankStatementParser';

export interface OfxStatementResult extends BankStatementParseResult {
  bankId?: string;
  accountId?: string;
  currency?: string;
  closingBalanceCentavos?: number;
}

function tagValue(block: string, tag: string): string {
  const match = block.match(new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i'));
  return match?.[1]?.trim() || '';
}

function ofxDate(value: string): string | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return year + '-' + month + '-' + day;
}

function amountToCents(value: string, allowZero = false): number | null {
  const amount = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(amount) || (!allowZero && amount === 0)) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && (allowZero || cents !== 0) ? cents : null;
}

export function parseBankStatementOfx(source: string): OfxStatementResult {
  const text = source.replace(/^\uFEFF/, '').trim();
  if (!text || !/<OFX[\s>]/i.test(text)) {
    return { rows: [], errors: [{ lineNumber: 1, message: 'Arquivo OFX vazio ou cabeçalho OFX não encontrado.' }], delimiter: 'OFX' };
  }

  const rows: BankStatementRow[] = [];
  const errors: Array<{ lineNumber: number; message: string }> = [];
  const blocks = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  blocks.forEach((match, index) => {
    const block = match[1];
    const date = ofxDate(tagValue(block, 'DTPOSTED'));
    const amount = amountToCents(tagValue(block, 'TRNAMT'));
    const description = tagValue(block, 'NAME') || tagValue(block, 'MEMO') || tagValue(block, 'PAYEE');
    if (!date || !description || amount === null) {
      errors.push({ lineNumber: index + 1, message: !date ? 'Data DTPOSTED inválida.' : !description ? 'Descrição NAME/MEMO ausente.' : 'TRNAMT inválido ou igual a zero.' });
      return;
    }
    const fitId = tagValue(block, 'FITID');
    rows.push({
      lineNumber: index + 1,
      data: date,
      descricao: description,
      valorCentavos: amount,
      ...(fitId ? { idExterno: fitId } : {}),
    } as BankStatementRow);
  });

  const ledgerBlock = text.match(/<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i)?.[1] || '';
  const closingBalanceCentavos = amountToCents(tagValue(ledgerBlock, 'BALAMT'), true);
  const bankId = tagValue(text, 'BANKID');
  const accountId = tagValue(text, 'ACCTID');
  const currency = tagValue(text, 'CURDEF') || 'BRL';

  if (blocks.length === 0) errors.push({ lineNumber: 1, message: 'Nenhuma transação STMTTRN foi encontrada no OFX.' });
  if (closingBalanceCentavos === null) errors.push({ lineNumber: 1, message: 'Saldo final LEDGERBAL/BALAMT não encontrado; informe-o manualmente na conciliação.' });

  return {
    rows,
    errors,
    delimiter: 'OFX',
    ...(bankId ? { bankId } : {}),
    ...(accountId ? { accountId } : {}),
    currency,
    ...(closingBalanceCentavos !== null ? { closingBalanceCentavos } : {}),
  };
}
