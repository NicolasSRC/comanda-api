import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { formatDateInTimeZone, formatPeriod, resolveDateRange } from './date-range';

describe('date-range', () => {
  describe('resolveDateRange', () => {
    it('interpreta las fechas sin hora como días completos en la zona del restaurante', () => {
      const range = resolveDateRange({
        desde: '2026-10-01',
        hasta: '2026-10-01',
        timeZone: 'America/Bogota',
      });

      expect(range.from.toISOString()).toBe('2026-10-01T05:00:00.000Z');
      expect(range.to.toISOString()).toBe('2026-10-02T04:59:59.999Z');
    });

    it('respeta las fechas ISO completas tal cual se envían', () => {
      const range = resolveDateRange({
        desde: '2026-10-01T12:00:00.000Z',
        hasta: '2026-10-02T12:00:00.000Z',
        timeZone: 'America/Bogota',
      });

      expect(range.from.toISOString()).toBe('2026-10-01T12:00:00.000Z');
      expect(range.to.toISOString()).toBe('2026-10-02T12:00:00.000Z');
    });

    it('usa los últimos 30 días cuando no se envían límites', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      const range = resolveDateRange({ timeZone: 'America/Bogota', now });

      expect(range.to).toEqual(now);
      expect(range.from.toISOString()).toBe('2026-10-01T12:00:00.000Z');
    });

    it('aplica el cambio de horario de verano al resolver días completos', () => {
      const range = resolveDateRange({
        desde: '2026-03-08',
        hasta: '2026-03-08',
        timeZone: 'America/New_York',
      });

      expect(range.from.toISOString()).toBe('2026-03-08T05:00:00.000Z');
      expect(range.to.toISOString()).toBe('2026-03-09T03:59:59.999Z');
    });

    it('rechaza un rango invertido', () => {
      expect(() =>
        resolveDateRange({
          desde: '2026-10-10',
          hasta: '2026-10-01',
          timeZone: 'America/Bogota',
        }),
      ).toThrow(BadRequestException);
    });

    it('rechaza fechas inválidas', () => {
      expect(() =>
        resolveDateRange({
          desde: 'no-es-una-fecha',
          timeZone: 'America/Bogota',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('formatDateInTimeZone', () => {
    it('devuelve la fecha local del restaurante', () => {
      expect(formatDateInTimeZone(new Date('2026-10-01T03:00:00.000Z'), 'America/Bogota')).toBe(
        '2026-09-30',
      );
    });
  });

  describe('formatPeriod', () => {
    const date = new Date('2026-10-28T15:00:00.000Z');

    it('agrupa por día', () => {
      expect(formatPeriod(date, 'America/Bogota', 'DIA')).toBe('2026-10-28');
    });

    it('agrupa por semana usando el lunes como inicio', () => {
      expect(formatPeriod(date, 'America/Bogota', 'SEMANA')).toBe('2026-10-26');
    });

    it('agrupa por mes', () => {
      expect(formatPeriod(date, 'America/Bogota', 'MES')).toBe('2026-10');
    });

    it('calcula el lunes correctamente cuando el día es domingo', () => {
      expect(formatPeriod(new Date('2026-11-01T15:00:00.000Z'), 'America/Bogota', 'SEMANA')).toBe(
        '2026-10-26',
      );
    });
  });
});
