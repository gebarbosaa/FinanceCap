export interface BankStatementRow {
  lineNumber: number;
  data: string;
  descricao: string;
  valorCentavos: number;
}

export interface BankStatementParseResult {
  rows: BankStatementRow[];
  errors: Array<{ lineNumber: number; message: string }>;
  delimiter: string;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const candidates = [';', '\t', ','];
  const counts = candidates.map((delimiter) => {
    let quoted = false;
    let count = 0;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        if (quoted && firstLine[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (firstLine[i] === delimiter && !quoted) count++;
    }
    return count;
  });
  const best = Math.max(...counts);
  return best > 0 ? candidates[counts.indexOf(best)] : ';';
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      fields.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field.trim());
  return fields;
}

function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseDate(value: string): string | null {
  const raw = value.trim();
  let year: number;
  let month: number;
  let day: number;
  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
  } else {
    match = raw.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (!match) return null;
    day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

function parseAmount(value: string): number | null {
  let raw = value.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!raw) return null;
  const negativeByParentheses = /^\(.*\)$/.test(raw);
  raw = raw.replace(/[()]/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw || !/\d/.test(raw)) return null;

  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    if (comma > dot) raw = raw.replace(/\./g, '').replace(',', '.');
    else raw = raw.replace(/,/g, '');
  } else if (comma >= 0) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if ((raw.match(/\./g) || []).length > 1) {
    const last = raw.lastIndexOf('.');
    raw = raw.slice(0, last).replace(/\./g, '') + raw.slice(last);
  }

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(Math.abs(amount) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return negativeByParentheses || amount < 0 ? -cents : cents;
}

export function parseBankStatementCsv(text: string): BankStatementParseResult {
  const normalized = text.replace(/^\uFEFF/, '').trim();
  if (!normalized) return { rows: [], errors: [{ lineNumber: 1, message: 'O extrato está vazio.' }], delimiter: ';' };

  const delimiter = detectDelimiter(normalized);
  const lines = normalized.split(/\r?\n/);
  const firstFields = parseDelimitedLine(lines[0], delimiter);
  const headers = firstFields.map(normalizeHeader);
  const dateAliases = ['data', 'date', 'datatransacao', 'datamovimento', 'lancamento'];
  const descriptionAliases = ['descricao', 'historico', 'description', 'memo', 'detalhe'];
  const amountAliases = ['valor', 'amount', 'valortransacao', 'montante'];
  const dateIndex = headers.findIndex((h) => dateAliases.includes(h));
  const descriptionIndex = headers.findIndex((h) => descriptionAliases.includes(h));
  const amountIndex = headers.findIndex((h) => amountAliases.includes(h));
  const hasHeader = dateIndex >= 0 && descriptionIndex >= 0 && amountIndex >= 0;
  const columns = hasHeader
    ? { date: dateIndex, description: descriptionIndex, amount: amountIndex }
    : { date: 0, description: 1, amount: 2 };

  const rows: BankStatementRow[] = [];
  const errors: Array<{ lineNumber: number; message: string }> = [];
  for (let index = hasHeader ? 1 : 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    const fields = parseDelimitedLine(line, delimiter);
    const date = parseDate(fields[columns.date] || '');
    const description = (fields[columns.description] || '').trim();
    const amount = parseAmount(fields[columns.amount] || '');
    if (!date) {
      errors.push({ lineNumber: index + 1, message: 'Data inválida ou ausente.' });
      continue;
    }
    if (!description) {
      errors.push({ lineNumber: index + 1, message: 'Descrição ausente.' });
      continue;
    }
    if (amount === null) {
      errors.push({ lineNumber: index + 1, message: 'Valor inválido, zero ou ausente.' });
      continue;
    }
    rows.push({ lineNumber: index + 1, data: date, descricao: description, valorCentavos: amount });
  }

  return { rows, errors, delimiter };
}
