import { BadRequestException } from '@nestjs/common';

export type ReportGrouping = 'DIA' | 'SEMANA' | 'MES';

export interface DateRange {
  from: Date;
  to: Date;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/**
 * Resuelve un rango de fechas de reportes.
 *
 * Las fechas sin hora (`YYYY-MM-DD`) se interpretan como días completos en la
 * zona horaria del restaurante; las fechas ISO completas se usan tal cual.
 * Si no se envían límites, se devuelven los últimos 30 días.
 */
export function resolveDateRange(input: {
  desde?: string;
  hasta?: string;
  timeZone: string;
  now?: Date;
  defaultDays?: number;
}): DateRange {
  const now = input.now ?? new Date();
  const defaultDays = input.defaultDays ?? 30;
  const to = input.hasta ? parseBoundary(input.hasta, input.timeZone, true) : now;
  const from = input.desde
    ? parseBoundary(input.desde, input.timeZone, false)
    : new Date(to.getTime() - defaultDays * DAY_MS);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new BadRequestException('Rango de fechas inválido');
  }
  if (from > to) {
    throw new BadRequestException('La fecha inicial no puede ser posterior a la final');
  }

  return { from, to };
}

/** Fecha local (`YYYY-MM-DD`) de un instante en la zona horaria indicada. */
export function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Etiqueta de agrupación de un instante:
 * - `DIA`: `YYYY-MM-DD`
 * - `SEMANA`: lunes de la semana (`YYYY-MM-DD`)
 * - `MES`: `YYYY-MM`
 */
export function formatPeriod(date: Date, timeZone: string, grouping: ReportGrouping): string {
  const day = formatDateInTimeZone(date, timeZone);
  if (grouping === 'DIA') {
    return day;
  }
  if (grouping === 'MES') {
    return day.slice(0, 7);
  }

  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const utcDay = new Date(Date.UTC(year!, month! - 1, dayOfMonth!));
  const daysFromMonday = (utcDay.getUTCDay() + 6) % 7;
  const monday = new Date(utcDay.getTime() - daysFromMonday * DAY_MS);

  return monday.toISOString().slice(0, 10);
}

function parseBoundary(value: string, timeZone: string, endOfDay: boolean): Date {
  const trimmed = value.trim();
  if (!DATE_ONLY.test(trimmed)) {
    return new Date(trimmed);
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  if (endOfDay) {
    const nextDay = new Date(Date.UTC(year!, month! - 1, day! + 1));
    return new Date(
      localToUtc(
        nextDay.getUTCFullYear(),
        nextDay.getUTCMonth() + 1,
        nextDay.getUTCDate(),
        0,
        0,
        0,
        0,
        timeZone,
      ).getTime() - 1,
    );
  }

  return localToUtc(year!, month!, day!, 0, 0, 0, 0, timeZone);
}

function localToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let utc = guess - offsetAt(new Date(guess), timeZone);
  utc = guess - offsetAt(new Date(utc), timeZone);
  return new Date(utc);
}

/** Diferencia en milisegundos entre la hora local y UTC para un instante. */
function offsetAt(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
}
