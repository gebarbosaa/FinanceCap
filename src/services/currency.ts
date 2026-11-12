/**
 * Utility functions for BRL currency (centavos) and Brazilian date formats
 */

/**
 * Format integer centavos to BRL currency string (e.g. R$ 1.234,56)
 */
export function formatCurrency(centavos: number): string {
  const isNegative = centavos < 0;
  const absCentavos = Math.abs(Math.round(centavos));
  const reais = Math.floor(absCentavos / 100);
  const cents = absCentavos % 100;

  // Format integer part with dots
  const reaisFormatted = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centsFormatted = cents.toString().padStart(2, '0');

  const formatted = `R$ ${reaisFormatted},${centsFormatted}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parse input string or decimal number to integer centavos
 */
export function parseToCentavos(value: string | number): number {
  if (typeof value === 'number') {
    return Math.round(value * 100);
  }
  if (!value) return 0;

  // Clean currency symbols, spaces
  let clean = value.replace(/[R$\s]/g, '').trim();

  // Handle Brazilian format (1.234,56 or 1234,56)
  if (clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  }

  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Format YYYY-MM-DD or ISO date string to DD/MM/AAAA
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

/**
 * Format date string DD/MM/AAAA to YYYY-MM-DD
 */
export function parseDateBRToISO(dateBR: string): string {
  if (!dateBR) return '';
  const parts = dateBR.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateBR;
}

/**
 * Format YYYY-MM to descriptive month in PT-BR (e.g. "Novembro/2026")
 */
export function formatCompetencia(competencia: string): string {
  if (!competencia) return '';
  const [year, month] = competencia.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const idx = parseInt(month, 10) - 1;
  if (idx >= 0 && idx < 12) {
    return `${monthNames[idx]} de ${year}`;
  }
  return competencia;
}

/**
 * Get current date in Sao Paulo timezone (YYYY-MM-DD)
 */
export function getCurrentDateISO(): string {
  const d = new Date();
  const spDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return spDate;
}

/**
 * Get current competence (YYYY-MM) in Sao Paulo timezone
 */
export function getCurrentCompetencia(): string {
  const iso = getCurrentDateISO();
  return iso.substring(0, 7);
}

/**
 * Calculate difference in months between two YYYY-MM
 */
export function monthDiff(fromComp: string, toComp: string): number {
  const [y1, m1] = fromComp.split('-').map(Number);
  const [y2, m2] = toComp.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/**
 * Add N months to YYYY-MM
 */
export function addMonthsToCompetencia(competencia: string, n: number): string {
  const [y, m] = competencia.split('-').map(Number);
  const date = new Date(y, m - 1 + n, 1);
  const nextY = date.getFullYear();
  const nextM = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${nextY}-${nextM}`;
}
