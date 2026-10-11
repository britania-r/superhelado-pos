// src/features/reports/lib/periods.ts
// Períodos del reporte: atajos (hoy, 7 días…), el período con el que se compara
// y textos para mostrarlos. Las fechas son 'YYYY-MM-DD' en hora de Lima.

export type PeriodPreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

export interface ReportPeriod {
  preset: PeriodPreset;
  current: DateRange;
  /** Período con el que se compara (mismo largo, justo antes) */
  previous: DateRange;
  /** Días del período actual */
  days: number;
  /** "Del 1 al 10 de octubre de 2026" */
  label: string;
  /** "vs ayer", "vs 21–30 sep"… para las variaciones */
  comparisonLabel: string;
  /** El período incluye hoy (que aún no termina) */
  includesToday: boolean;
  isSingleDay: boolean;
}

/** Máximo que aceptan las funciones rpt_* */
export const MAX_RANGE_DAYS = 366;

export const PRESET_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'last7', label: 'Últimos 7 días' },
  { value: 'last30', label: 'Últimos 30 días' },
  { value: 'thisMonth', label: 'Este mes' },
  { value: 'lastMonth', label: 'Mes pasado' },
  { value: 'custom', label: 'Personalizado' },
];

/* ── Aritmética de fechas sin zonas horarias (todo en UTC) ── */

const DAY_MS = 86_400_000;

const toUtc = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Fecha como Date a mediodía UTC: para formatear sin que cambie de día */
export const isoToDate = (iso: string) => new Date(toUtc(iso) + DAY_MS / 2);

export const addDays = (iso: string, amount: number) => fromUtc(toUtc(iso) + amount * DAY_MS);

/** Días de `start` a `end`, contando ambos */
export const countDays = (start: string, end: string) => Math.round((toUtc(end) - toUtc(start)) / DAY_MS) + 1;

/** 1 = lunes … 7 = domingo */
export const isoWeekday = (iso: string) => {
  const day = new Date(toUtc(iso)).getUTCDay();
  return day === 0 ? 7 : day;
};

const lastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;

/** Mismo día del mes anterior (o el último si no existe: 31 → 30) */
const sameDayPrevMonth = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const safeDay = Math.min(day, lastDayOfMonth(prevYear, prevMonth));
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
};

const monthEnd = (iso: string) => {
  const [year, month] = iso.split('-').map(Number);
  return `${iso.slice(0, 7)}-${String(lastDayOfMonth(year, month)).padStart(2, '0')}`;
};

const limaDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Día de Lima ('YYYY-MM-DD') de un momento, por ejemplo de un created_at */
export const limaDay = (timestamp: string | Date) => limaDateFormat.format(new Date(timestamp));

/** Hoy en Perú, sin importar la zona horaria de la computadora */
export const todayInLima = () => limaDay(new Date());

/** Hora actual en Perú (0–23) */
export const currentLimaHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));

/** Cuántas veces aparece cada día de la semana en el rango (índice 1–7) */
export const countWeekdays = ({ start, end }: DateRange) => {
  const counts = [0, 0, 0, 0, 0, 0, 0, 0];
  const days = countDays(start, end);
  for (let offset = 0; offset < days; offset += 1) counts[isoWeekday(addDays(start, offset))] += 1;
  return counts;
};

/* ── Textos ── */

const DATE_FORMATS = {
  long: { weekday: 'long', day: 'numeric', month: 'long' },
  dayMonth: { day: 'numeric', month: 'long' },
  dayMonthYear: { day: 'numeric', month: 'long', year: 'numeric' },
  short: { day: 'numeric', month: 'short' },
  shortYear: { day: 'numeric', month: 'short', year: 'numeric' },
  weekdayShort: { weekday: 'short', day: 'numeric', month: 'short' },
  monthYear: { month: 'long', year: 'numeric' },
  month: { month: 'long' },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateFormat = keyof typeof DATE_FORMATS;

/** Formatea 'YYYY-MM-DD' en español de Perú, sin "dom," ni "oct." (sin coma ni punto) */
export const formatDay = (iso: string, format: DateFormat) =>
  isoToDate(iso)
    .toLocaleDateString('es-PE', { ...DATE_FORMATS[format], timeZone: 'UTC' })
    .replace(/,/g, '')
    .replace(/\.(?=\s|$)/g, '');

/** "Del 1 al 10 de octubre de 2026", "sábado 4 de octubre", "Del 20 sep al 10 oct de 2026" */
export const formatRange = ({ start, end }: DateRange, today = todayInLima()) => {
  const sameYearAsToday = start.slice(0, 4) === today.slice(0, 4) && end.slice(0, 4) === today.slice(0, 4);

  if (start === end) {
    const text = formatDay(start, 'long');
    return sameYearAsToday ? text : `${text} de ${start.slice(0, 4)}`;
  }

  const year = sameYearAsToday ? '' : ` de ${end.slice(0, 4)}`;
  const isWholeMonth = start === monthStart(start) && end === monthEnd(start);
  if (isWholeMonth) return formatDay(start, sameYearAsToday ? 'month' : 'monthYear').replace(/^./, (c) => c.toUpperCase());

  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `Del ${Number(start.slice(8))} al ${formatDay(end, 'dayMonth')}${year}`;
  }
  if (start.slice(0, 4) === end.slice(0, 4)) {
    return `Del ${formatDay(start, 'short')} al ${formatDay(end, 'short')}${year}`;
  }
  return `Del ${formatDay(start, 'shortYear')} al ${formatDay(end, 'shortYear')}`;
};

/** Versión corta para comparar: "21–30 sep", "4 oct", "20 sep – 10 oct" */
const formatRangeShort = ({ start, end }: DateRange) => {
  if (start === end) return formatDay(start, 'short');
  if (start.slice(0, 7) === end.slice(0, 7)) return `${Number(start.slice(8))}–${formatDay(end, 'short')}`;
  return `${formatDay(start, 'short')} – ${formatDay(end, 'short')}`;
};

/* ── Resolver un atajo ── */

const previousOfSameLength = (range: DateRange): DateRange => {
  const days = countDays(range.start, range.end);
  return { start: addDays(range.start, -days), end: addDays(range.start, -1) };
};

export const resolvePeriod = (preset: PeriodPreset, custom: DateRange, today = todayInLima()): ReportPeriod => {
  let current: DateRange;
  let previous: DateRange;
  let comparisonLabel: string;

  switch (preset) {
    case 'today':
      current = { start: today, end: today };
      previous = { start: addDays(today, -1), end: addDays(today, -1) };
      comparisonLabel = 'vs ayer';
      break;
    case 'yesterday': {
      const yesterday = addDays(today, -1);
      current = { start: yesterday, end: yesterday };
      previous = { start: addDays(today, -2), end: addDays(today, -2) };
      comparisonLabel = 'vs anteayer';
      break;
    }
    case 'last7':
    case 'last30': {
      /* Días completos: terminan ayer (hoy aún no cierra y bajaría la comparación) */
      const days = preset === 'last7' ? 7 : 30;
      const yesterday = addDays(today, -1);
      current = { start: addDays(yesterday, -(days - 1)), end: yesterday };
      previous = previousOfSameLength(current);
      comparisonLabel = `vs los ${days} días anteriores`;
      break;
    }
    case 'thisMonth': {
      current = { start: monthStart(today), end: today };
      const prevStart = monthStart(sameDayPrevMonth(today));
      previous = { start: prevStart, end: sameDayPrevMonth(today) };
      comparisonLabel = `vs ${formatRangeShort(previous)}`;
      break;
    }
    case 'lastMonth': {
      const prevMonthDay = sameDayPrevMonth(monthStart(today));
      current = { start: monthStart(prevMonthDay), end: monthEnd(prevMonthDay) };
      const beforeDay = sameDayPrevMonth(current.start);
      previous = { start: monthStart(beforeDay), end: monthEnd(beforeDay) };
      comparisonLabel = `vs ${formatDay(previous.start, 'month').toLowerCase()}`;
      break;
    }
    default:
      current = custom.start <= custom.end ? custom : { start: custom.end, end: custom.start };
      previous = previousOfSameLength(current);
      comparisonLabel = `vs ${formatRangeShort(previous)}`;
  }

  const days = countDays(current.start, current.end);
  return {
    preset,
    current,
    previous,
    days,
    label: formatRange(current, today),
    comparisonLabel,
    includesToday: current.start <= today && today <= current.end,
    isSingleDay: days === 1,
  };
};