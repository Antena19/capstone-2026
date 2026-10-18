import { AsistenciaRespuesta } from '../models/asistencia';
import {
  EstadoAsistencia,
  EstadoConfirmacionViaje,
  EstadoServicio,
  PasajeroServicioConductor,
  TipoParticipacionConductor,
} from '../models/conductor';

export const MENSAJE_CONFIRMACION_ASISTENCIA_MANUAL =
  '¿Confirmas que este pasajero abordó el vehículo? La asistencia quedará registrada manualmente en el sistema.';

export interface PasajeroElegible {
  tipoParticipacion: TipoParticipacionConductor;
  estadoConfirmacion: EstadoConfirmacionViaje | null;
  tieneAsistencia: boolean;
  estadoAsistencia: EstadoAsistencia | null;
}

export function puedeRegistrarAsistenciaManual(
  estadoServicio: EstadoServicio | null | undefined,
  pasajero: PasajeroElegible,
): boolean {
  if (estadoServicio !== 'EN_CURSO') {
    return false;
  }

  if (pasajero.tipoParticipacion !== 'PLANIFICADO') {
    return false;
  }

  if (pasajero.estadoConfirmacion !== 'CONFIRMADO' && pasajero.estadoConfirmacion !== 'PENDIENTE') {
    return false;
  }

  return !pasajero.tieneAsistencia && pasajero.estadoAsistencia == null;
}

export interface PresentacionAsistenciaTarjeta {
  texto: 'Registrada' | 'Pendiente' | 'Provisional' | 'Anulada';
  color: 'success' | 'medium' | 'warning';
  anulada: boolean;
}

export function textoAsistenciaEfectiva(estado: EstadoAsistencia | null | undefined): string {
  return presentacionAsistenciaTarjeta(estado).texto;
}

export function presentacionAsistenciaTarjeta(
  estado: EstadoAsistencia | null | undefined,
): PresentacionAsistenciaTarjeta {
  if (estado === 'VALIDA') {
    return { texto: 'Registrada', color: 'success', anulada: false };
  }

  if (estado === 'PROVISIONAL') {
    return { texto: 'Provisional', color: 'warning', anulada: false };
  }

  if (estado === 'ANULADA') {
    return { texto: 'Anulada', color: 'medium', anulada: true };
  }

  return { texto: 'Pendiente', color: 'medium', anulada: false };
}

export function aplicarAsistenciaManual(
  pasajeros: readonly PasajeroServicioConductor[],
  respuesta: AsistenciaRespuesta,
): PasajeroServicioConductor[] {
  return pasajeros.map((pasajero) =>
    pasajero.idPasajero === respuesta.idPasajero
      ? {
          ...pasajero,
          tieneAsistencia: true,
          metodoAsistencia: respuesta.metodo,
          tipoAsistencia: respuesta.tipoAsistencia,
          estadoAsistencia: respuesta.estado,
          fechaHoraAsistencia: respuesta.fechaHora,
        }
      : pasajero,
  );
}

export function resultadoErrorAsistenciaManual(
  status: number,
  mensajeServidor?: string | null,
): { mensaje: string; refrescar: boolean } {
  if (status === 401 || status === 403) {
    return {
      mensaje: 'No tienes autorización para registrar esta asistencia.',
      refrescar: false,
    };
  }

  if (status === 409) {
    return {
      mensaje: 'La asistencia ya estaba registrada.',
      refrescar: true,
    };
  }

  const texto = mensajeServidor?.trim();
  return {
    mensaje: texto || 'No fue posible registrar la asistencia.',
    refrescar: false,
  };
}

export async function ejecutarRegistroManual<T>(
  confirmar: () => Promise<string | undefined>,
  registrar: () => Promise<T>,
): Promise<{ confirmado: false } | { confirmado: true; respuesta: T }> {
  const rol = await confirmar();
  if (rol !== 'confirm') {
    return { confirmado: false };
  }

  return { confirmado: true, respuesta: await registrar() };
}
