import { describe, expect, it } from 'vitest';
import { evaluarInicioPorReloj, horaAperturaInicio } from './inicio-conductor';

const FECHA = '2026-10-17';

describe('ventana de inicio del conductor', () => {
  it('no permite iniciar antes de los 30 minutos', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', FECHA, '06:29:59')).toBe('antes');
  });

  it('permite iniciar desde las 06:30 inclusive', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', FECHA, '06:30:00')).toBe('disponible');
  });

  it('permite iniciar en el minuto 30 posterior inclusive', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', FECHA, '07:30:00')).toBe('disponible');
  });

  it('impide iniciar un segundo después de los 30 minutos', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', FECHA, '07:30:01')).toBe('vencido');
  });

  it('deja en antes un servicio futuro y marca vencido el día siguiente', () => {
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', '2026-10-16', '18:00:00')).toBe('antes');
    expect(evaluarInicioPorReloj(FECHA, '07:00:00', '2026-10-18', '07:00:00')).toBe('vencido');
  });

  it('abre la ventana 30 minutos antes aunque cruce la medianoche', () => {
    expect(evaluarInicioPorReloj('2026-10-18', '00:05:00', '2026-10-17', '23:34:59')).toBe('antes');
    expect(evaluarInicioPorReloj('2026-10-18', '00:05:00', '2026-10-17', '23:35:00')).toBe('disponible');
    expect(horaAperturaInicio('07:00:00')).toBe('06:30');
    expect(horaAperturaInicio('00:05:00')).toBe('23:35');
  });
});
