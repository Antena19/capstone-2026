import { describe, expect, it, vi } from 'vitest';
import { AsistenciaRespuesta } from '../models/asistencia';
import { PasajeroServicioConductor } from '../models/conductor';
import { etiquetaConfirmacion } from './formato-servicio';
import {
  MENSAJE_CONFIRMACION_ASISTENCIA_MANUAL,
  aplicarAsistenciaManual,
  ejecutarRegistroManual,
  puedeRegistrarAsistenciaManual,
  presentacionAsistenciaTarjeta,
  resultadoErrorAsistenciaManual,
  textoAsistenciaEfectiva,
} from './asistencia-manual-conductor';

function pasajero(parcial: Partial<PasajeroServicioConductor> = {}): PasajeroServicioConductor {
  return {
    idPasajero: 7,
    nombre: 'Ana',
    tipoParticipacion: 'PLANIFICADO',
    estadoConfirmacion: 'CONFIRMADO',
    fechaConfirmacion: null,
    estadoPasajeroServicio: 'ACTIVO',
    tieneAsistencia: false,
    metodoAsistencia: null,
    tipoAsistencia: null,
    estadoAsistencia: null,
    fechaHoraAsistencia: null,
    idPuntoRecogida: null,
    nombrePuntoRecogida: null,
    referenciaPuntoRecogida: null,
    ordenPuntoRecogida: null,
    ubicacionPuntoRecogida: null,
    ...parcial,
  };
}

describe('visibilidad del registro manual', () => {
  it('permite confirmar o quedar pendiente solo con el servicio en curso', () => {
    expect(puedeRegistrarAsistenciaManual('EN_CURSO', pasajero())).toBe(true);
    expect(
      puedeRegistrarAsistenciaManual('EN_CURSO', pasajero({ estadoConfirmacion: 'PENDIENTE' })),
    ).toBe(true);
  });

  it('oculta el botón si el servicio no está en curso', () => {
    for (const estado of ['PROGRAMADO', 'FINALIZADO', 'CANCELADO'] as const) {
      expect(puedeRegistrarAsistenciaManual(estado, pasajero())).toBe(false);
    }
  });

  it('oculta el botón si el pasajero rechazó el viaje', () => {
    expect(
      puedeRegistrarAsistenciaManual('EN_CURSO', pasajero({ estadoConfirmacion: 'RECHAZADO' })),
    ).toBe(false);
  });

  it('oculta el botón si ya hay una asistencia', () => {
    expect(puedeRegistrarAsistenciaManual('EN_CURSO', pasajero({ tieneAsistencia: true }))).toBe(false);
    expect(
      puedeRegistrarAsistenciaManual('EN_CURSO', pasajero({ estadoAsistencia: 'VALIDA' })),
    ).toBe(false);
  });

  it('oculta el botón para un pasajero no planificado', () => {
    expect(
      puedeRegistrarAsistenciaManual(
        'EN_CURSO',
        pasajero({ tipoParticipacion: 'NO_PLANIFICADO', estadoConfirmacion: null }),
      ),
    ).toBe(false);
  });
});

describe('tarjetas de asistencia', () => {
  it('distingue registrada, pendiente, provisional y anulada', () => {
    expect(presentacionAsistenciaTarjeta('VALIDA')).toEqual({
      texto: 'Registrada',
      color: 'success',
      anulada: false,
    });
    expect(presentacionAsistenciaTarjeta(null)).toEqual({
      texto: 'Pendiente',
      color: 'medium',
      anulada: false,
    });
    expect(presentacionAsistenciaTarjeta(undefined)).toEqual({
      texto: 'Pendiente',
      color: 'medium',
      anulada: false,
    });
    expect(presentacionAsistenciaTarjeta('PROVISIONAL')).toEqual({
      texto: 'Provisional',
      color: 'warning',
      anulada: false,
    });
    expect(presentacionAsistenciaTarjeta('ANULADA')).toEqual({
      texto: 'Anulada',
      color: 'medium',
      anulada: true,
    });
  });

  it('no usa el estado de confirmación del viaje como asistencia', () => {
    expect(etiquetaConfirmacion('CONFIRMADO')).toBe('Confirmado');
    expect(etiquetaConfirmacion('PENDIENTE')).toBe('Pendiente');
    expect(etiquetaConfirmacion('RECHAZADO')).toBe('Rechazado');
    expect(presentacionAsistenciaTarjeta('VALIDA').texto).not.toBe(etiquetaConfirmacion('CONFIRMADO'));
    expect(presentacionAsistenciaTarjeta('ANULADA').anulada).toBe(true);
    expect(presentacionAsistenciaTarjeta(null).anulada).toBe(false);
  });
});

describe('confirmación del diálogo', () => {
  it('incluye el texto que debe ver el conductor', () => {
    expect(MENSAJE_CONFIRMACION_ASISTENCIA_MANUAL).toBe(
      '¿Confirmas que este pasajero abordó el vehículo? La asistencia quedará registrada manualmente en el sistema.',
    );
  });

  it('no llama al endpoint si el conductor cancela', async () => {
    const registrar = vi.fn();

    const resultado = await ejecutarRegistroManual(async () => 'cancel', registrar);

    expect(resultado).toEqual({ confirmado: false });
    expect(registrar).not.toHaveBeenCalled();
  });

  it('registra solo después de confirmar', async () => {
    const respuesta = respuestaManual();
    const registrar = vi.fn(async () => respuesta);

    const resultado = await ejecutarRegistroManual(async () => 'confirm', registrar);

    expect(registrar).toHaveBeenCalledOnce();
    expect(resultado).toEqual({ confirmado: true, respuesta });
  });
});

describe('actualización y errores', () => {
  it('marca la asistencia como registrada y manual', () => {
    const actualizados = aplicarAsistenciaManual([pasajero()], respuestaManual());
    const ana = actualizados[0];

    expect(ana?.tieneAsistencia).toBe(true);
    expect(ana?.metodoAsistencia).toBe('MANUAL');
    expect(ana?.estadoAsistencia).toBe('VALIDA');
    expect(textoAsistenciaEfectiva(ana?.estadoAsistencia)).toBe('Registrada');
    expect(puedeRegistrarAsistenciaManual('EN_CURSO', ana!)).toBe(false);
  });

  it('pide refrescar la lista cuando la asistencia ya existe', () => {
    expect(resultadoErrorAsistenciaManual(409)).toEqual({
      mensaje: 'La asistencia ya estaba registrada.',
      refrescar: true,
    });
  });

  it('informa acceso no autorizado y conserva el mensaje de otros errores', () => {
    expect(resultadoErrorAsistenciaManual(401).mensaje).toBe(
      'No tienes autorización para registrar esta asistencia.',
    );
    expect(resultadoErrorAsistenciaManual(403).refrescar).toBe(false);
    expect(resultadoErrorAsistenciaManual(400, 'El servicio debe estar en curso.').mensaje).toBe(
      'El servicio debe estar en curso.',
    );
    expect(resultadoErrorAsistenciaManual(500).mensaje).toBe(
      'No fue posible registrar la asistencia.',
    );
  });
});

function respuestaManual(): AsistenciaRespuesta {
  return {
    idAsistencia: 4,
    idServicio: 54,
    idPasajero: 7,
    fechaHora: '2026-10-18T15:40:00Z',
    metodo: 'MANUAL',
    tipoAsistencia: 'PLANIFICADA',
    excedeCapacidad: false,
    estado: 'VALIDA',
  };
}
