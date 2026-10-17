import { describe, expect, it } from 'vitest';

const ETIQUETAS = [
  ['Programado', '#1e3a8a', '#eff6ff'],
  ['En curso', '#115e59', '#f0fdfa'],
  ['Finalizado', '#047857', '#ecfdf5'],
  ['Cancelado', '#991b1b', '#fef2f2'],
] as const;

describe('contraste de las etiquetas de estado', () => {
  it.each(ETIQUETAS)('%s supera 4.5:1', (_nombre, texto, fondo) => {
    expect(relacionContraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it('el azul sobre azul anterior no cumple', () => {
    expect(relacionContraste('#1d4ed8', '#2563eb')).toBeLessThan(3);
  });
});

function relacionContraste(texto: string, fondo: string): number {
  const clara = Math.max(luminancia(texto), luminancia(fondo));
  const oscura = Math.min(luminancia(texto), luminancia(fondo));
  return (clara + 0.05) / (oscura + 0.05);
}

function luminancia(hex: string): number {
  const valor = Number.parseInt(hex.slice(1), 16);
  const canales = [valor >> 16, (valor >> 8) & 255, valor & 255].map((canal) => {
    const normalizado = canal / 255;
    return normalizado <= 0.03928
      ? normalizado / 12.92
      : ((normalizado + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}
