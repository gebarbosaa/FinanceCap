/** Strict YYYY-MM-DD calendar-date validation without timezone normalization. */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

export function getLocalISODate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getEffectiveInvoiceStatus<T extends string>(status: T, dueDate: string, today: string = getLocalISODate()): T | 'VENCIDA' {
  if (status === 'PAGA' || status === 'CANCELADA') return status;
  return isValidISODate(dueDate) && dueDate < today ? 'VENCIDA' : status;
}

export function getEffectiveDebtStatus<T extends string>(status: T, dueDate: string, today: string = getLocalISODate()): T | 'ATRASADO' {
  if (status === 'QUITADO') return status;
  return isValidISODate(dueDate) && dueDate < today ? 'ATRASADO' : status;
}
