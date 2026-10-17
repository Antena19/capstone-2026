import { describe, expect, it } from 'vitest';
import { nombreDeSaludo } from './nombre-usuario';

describe('nombre de saludo', () => {
  it('usa la primera palabra del nombre guardado', () => {
    expect(nombreDeSaludo('Ana Perez Test')).toBe('Ana');
  });

  it('conserva un nombre de una sola palabra', () => {
    expect(nombreDeSaludo('Ana')).toBe('Ana');
  });

  it('no inventa un nombre cuando la ficha no lo trae', () => {
    expect(nombreDeSaludo(null)).toBeNull();
    expect(nombreDeSaludo('   ')).toBeNull();
  });
});
