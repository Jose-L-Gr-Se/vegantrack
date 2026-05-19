const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// "YYYY-MM-DD" → Date object in local time (avoids UTC offset issues)
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateHeader(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Hoy';
  if (dateStr === yesterdayStr) return 'Ayer';

  const day = DAYS[date.getDay()];
  const dayNum = date.getDate();
  const month = MONTHS[date.getMonth()];
  return `${day} ${dayNum} ${month}`;
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayString();
}
