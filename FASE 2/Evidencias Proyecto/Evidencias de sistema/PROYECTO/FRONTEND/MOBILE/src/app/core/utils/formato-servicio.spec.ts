import { describe, expect, it } from 'vitest';
import { etiquetaAsistenciaListado, etiquetaNoPlanificado } from './formato-servicio';

describe('participación y asistencia del pasajero', () => {
  it('marca No planificado solo cuando el servicio entra por asistencia', () => {
    expect(etiquetaNoPlanificado(false)).toBe('No planificado');
    expect(etiquetaNoPlanificado(true)).toBeNull();
  });

  it('muestra el estado real de la asistencia en el listado', () => {
    expect(etiquetaAsistenciaListado(true, 'VALIDA')).toBe('Asistencia registrada');
    expect(etiquetaAsistenciaListado(true, 'PROVISIONAL')).toBe('Asistencia pendiente');
    expect(etiquetaAsistenciaListado(true, 'ANULADA')).toBe('Asistencia anulada');
    expect(etiquetaAsistenciaListado(false, 'PROVISIONAL')).toBeNull();
  });
});
