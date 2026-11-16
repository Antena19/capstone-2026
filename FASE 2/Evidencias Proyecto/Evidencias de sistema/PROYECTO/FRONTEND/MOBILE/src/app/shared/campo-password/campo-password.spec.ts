import { describe, expect, it } from 'vitest';
import { etiquetaOjoPassword, tipoCampoPassword } from './campo-password.component';

describe('visibilidad de contraseña', () => {
  it('empieza oculta y alterna el tipo del campo', () => {
    expect(tipoCampoPassword(false)).toBe('password');
    expect(tipoCampoPassword(true)).toBe('text');
  });

  it('anuncia mostrar u ocultar según el estado', () => {
    expect(etiquetaOjoPassword(false)).toBe('Mostrar contraseña');
    expect(etiquetaOjoPassword(true)).toBe('Ocultar contraseña');
  });
});
