import { describe, expect, it } from 'vitest';
import { textoCancelacion } from './formato-servicio';

describe('texto de cancelación', () => {
  it('explica la falta de inicio cuando el motivo viene informado', () => {
    expect(textoCancelacion('CANCELADO', 'FALTA_DE_INICIO')).toBe(
      'Recorrido cancelado por falta de inicio.',
    );
  });

  it('mantiene el aviso genérico si el servicio antiguo no tiene motivo', () => {
    expect(textoCancelacion('CANCELADO', null)).toBe('Recorrido cancelado');
    expect(textoCancelacion('CANCELADO', undefined)).toBe('Recorrido cancelado');
  });

  it('no anuncia cancelación en otro estado', () => {
    expect(textoCancelacion('PROGRAMADO', 'FALTA_DE_INICIO')).toBeNull();
    expect(textoCancelacion('EN_CURSO', null)).toBeNull();
    expect(textoCancelacion('FINALIZADO', null)).toBeNull();
  });
});
