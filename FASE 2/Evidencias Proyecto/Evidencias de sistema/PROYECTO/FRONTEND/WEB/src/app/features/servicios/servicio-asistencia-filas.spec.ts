import { Asistencia } from '../../core/models/asistencia';
import { Pasajero } from '../../core/models/pasajero';
import { PasajeroServicio } from '../../core/models/servicio';
import {
  construirFilasAsistencia,
  resumenAsistencia,
} from './servicio-asistencia-filas';

describe('filas de asistencia del servicio', () => {
  const diego = pasajero(1, 'Diego Muñoz Vera', '11.111.111-1');
  const prueba = pasajero(2, 'Pasajero Prueba', '22.222.222-2');
  const ausente = pasajero(3, 'Ana Soto', '33.333.333-3');

  it('incluye al planificado con QR y al no planificado con QR, una sola vez', () => {
    const filas = construirFilasAsistencia(
      [asociacion(1, 'ACTIVO', 'CONFIRMADO')],
      [asistencia(1, 'QR', 'PLANIFICADA', 'VALIDA'), asistencia(2, 'QR', 'NO_PLANIFICADA', 'VALIDA')],
      [diego, prueba],
    );

    expect(filas.map((fila) => fila.idPasajero)).toEqual([1, 2]);
    expect(filas[0]).toEqual(
      jasmine.objectContaining({
        nombre: 'Diego Muñoz Vera',
        participacion: 'PLANIFICADO',
        confirmacion: 'CONFIRMADO',
        estado: 'VALIDA',
        metodo: 'QR',
      }),
    );
    expect(filas[1]).toEqual(
      jasmine.objectContaining({
        nombre: 'Pasajero Prueba',
        participacion: 'NO_PLANIFICADO',
        confirmacion: null,
        estado: 'VALIDA',
        metodo: 'QR',
      }),
    );
    expect(resumenAsistencia(filas)).toEqual({ total: 2, efectivas: 2, porcentaje: '100%' });
  });

  it('conserva al planificado sin asistencia y no lo cuenta como efectivo', () => {
    const filas = construirFilasAsistencia(
      [asociacion(3, 'ACTIVO', 'PENDIENTE'), asociacion(1, 'ACTIVO', 'CONFIRMADO')],
      [asistencia(1, 'MANUAL', 'PLANIFICADA', 'VALIDA')],
      [diego, ausente],
    );

    expect(filas.map((fila) => [fila.nombre, fila.participacion, fila.estado, fila.metodo])).toEqual([
      ['Ana Soto', 'PLANIFICADO', null, null],
      ['Diego Muñoz Vera', 'PLANIFICADO', 'VALIDA', 'MANUAL'],
    ]);
    expect(resumenAsistencia(filas)).toEqual({ total: 2, efectivas: 1, porcentaje: '50%' });
  });

  it('muestra provisional y anulada sin contarlas como asistencia efectiva', () => {
    const filas = construirFilasAsistencia(
      [asociacion(1, 'ACTIVO', 'PENDIENTE')],
      [
        asistencia(1, 'QR', 'PLANIFICADA', 'PROVISIONAL', '2026-10-25T12:00:00Z'),
        asistencia(2, 'QR', 'NO_PLANIFICADA', 'ANULADA', '2026-10-25T12:05:00Z'),
      ],
      [diego, prueba],
    );

    expect(filas.map((fila) => [fila.participacion, fila.estado])).toEqual([
      ['PLANIFICADO', 'PROVISIONAL'],
      ['NO_PLANIFICADO', 'ANULADA'],
    ]);
    expect(resumenAsistencia(filas).efectivas).toBe(0);
    expect(resumenAsistencia(filas).porcentaje).toBe('0%');
  });

  it('no duplica a quien está planificado y también tiene asistencia', () => {
    const filas = construirFilasAsistencia(
      [asociacion(1, 'ACTIVO', 'CONFIRMADO'), asociacion(1, 'CANCELADO', 'RECHAZADO')],
      [asistencia(1, 'QR', 'PLANIFICADA', 'VALIDA')],
      [diego],
    );

    expect(filas).toHaveSize(1);
    expect(filas[0].participacion).toBe('PLANIFICADO');
    expect(filas[0].confirmacion).toBe('CONFIRMADO');
  });

  it('trata una asociación cancelada con asistencia como no planificada', () => {
    const filas = construirFilasAsistencia(
      [asociacion(2, 'CANCELADO', 'RECHAZADO')],
      [asistencia(2, 'QR', 'NO_PLANIFICADA', 'VALIDA')],
      [prueba],
    );

    expect(filas).toEqual([
      jasmine.objectContaining({
        idPasajero: 2,
        participacion: 'NO_PLANIFICADO',
        confirmacion: null,
        estado: 'VALIDA',
      }),
    ]);
  });

  it('omite una asociación cancelada sin asistencia', () => {
    const filas = construirFilasAsistencia([asociacion(2, 'CANCELADO', 'RECHAZADO')], [], [prueba]);

    expect(filas).toEqual([]);
    expect(resumenAsistencia(filas)).toEqual({ total: 0, efectivas: 0, porcentaje: '—' });
  });

  it('usa un nombre de respaldo si el pasajero no viene en el catálogo', () => {
    const filas = construirFilasAsistencia(
      [],
      [asistencia(9, 'MANUAL', 'NO_PLANIFICADA', 'VALIDA')],
      [],
    );

    expect(filas[0].nombre).toBe('Pasajero #9');
    expect(filas[0].rut).toBe('—');
    expect(filas[0].metodo).toBe('MANUAL');
  });
});

function pasajero(idPasajero: number, nombre: string, rut: string): Pasajero {
  return {
    idPasajero,
    idEmpresa: 1,
    idUsuario: null,
    nombre,
    rut,
    telefono: '+56911111111',
    email: null,
    direccion: 'Dirección',
    estado: 'ACTIVO',
    estadoAcceso: 'ACTIVADA',
  };
}

function asociacion(
  idPasajero: number,
  estado: PasajeroServicio['estado'],
  estadoConfirmacion: PasajeroServicio['estadoConfirmacion'],
): PasajeroServicio {
  return {
    idPasajeroServicio: idPasajero,
    idServicio: 10,
    idPasajero,
    idPuntoRecogida: null,
    estadoConfirmacion,
    fechaConfirmacion: null,
    estado,
  };
}

function asistencia(
  idPasajero: number,
  metodo: Asistencia['metodo'],
  tipoAsistencia: Asistencia['tipoAsistencia'],
  estado: Asistencia['estado'],
  fechaHora = '2026-10-25T15:00:00Z',
): Asistencia {
  return {
    idAsistencia: idPasajero,
    idServicio: 10,
    idPasajero,
    fechaHora,
    metodo,
    tipoAsistencia,
    excedeCapacidad: false,
    estado,
  };
}
