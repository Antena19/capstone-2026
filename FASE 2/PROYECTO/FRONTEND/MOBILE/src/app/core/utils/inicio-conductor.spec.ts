import { describe, expect, it } from 'vitest';
import { evaluarInicioPorReloj, horaAperturaInicio } from './inicio-conductor';

const FECHA = '2026-10-17';

describe('ventana de inicio del conductor', () => {
  it('no permite iniciar antes de los 10 minutos', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', FECHA, '06:49:59')).toBe('antes');
  });

  it('permite iniciar desde las 06:50 inclusive', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', FECHA, '06:50:00')).toBe('disponible');
  });

  it('permite iniciar hasta el segundo anterior a los 30 minutos', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', FECHA, '07:29:59')).toBe('disponible');
  });

  it('impide iniciar al cumplirse los 30 minutos', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', FECHA, '07:30:00')).toBe('vencido');
  });

  it('deja en antes un servicio futuro y marca vencido el día siguiente', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', '2026-10-16', '18:00:00')).toBe('antes');
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', '2026-10-18', '07:00:00')).toBe('vencido');
  });

  it('abre la ventana 10 minutos antes aunque cruce la medianoche', () => {
    expect(evaluarInicioPorReloj('2026-10-18', '00:05:00', '2026-10-17', '23:55:00')).toBe('disponible');
    expect(horaAperturaInicio('07:00:00')).toBe('06:50');
    expect(horaAperturaInicio('00:05:00')).toBe('23:55');
  });
});
