import { etiquetaMetodoRegistro } from './metodo-asistencia';

describe('método de registro de asistencia', () => {
  it('muestra código QR', () => {
    expect(etiquetaMetodoRegistro('QR')).toBe('Código QR');
  });

  it('muestra manual', () => {
    expect(etiquetaMetodoRegistro('MANUAL')).toBe('Manual');
  });

  it('muestra un guion cuando no hay asistencia', () => {
    expect(etiquetaMetodoRegistro(null)).toBe('—');
    expect(etiquetaMetodoRegistro(undefined)).toBe('—');
  });
});