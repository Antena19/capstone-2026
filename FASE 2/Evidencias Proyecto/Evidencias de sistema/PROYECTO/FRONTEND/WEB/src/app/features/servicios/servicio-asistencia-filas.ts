import { Asistencia, EstadoAsistencia, MetodoAsistencia } from '../../core/models/asistencia';
import { Pasajero } from '../../core/models/pasajero';
import { EstadoConfirmacionViaje, PasajeroServicio } from '../../core/models/servicio';

export type ParticipacionAsistencia = 'PLANIFICADO' | 'NO_PLANIFICADO';

export interface FilaAsistenciaServicio {
  idPasajero: number;
  nombre: string;
  rut: string;
  participacion: ParticipacionAsistencia;
  confirmacion: EstadoConfirmacionViaje | null;
  estado: EstadoAsistencia | null;
  metodo: MetodoAsistencia | null;
  fechaHora: string | null;
}

export interface ResumenAsistenciaServicio {
  total: number;
  efectivas: number;
  porcentaje: string;
}

export function construirFilasAsistencia(
  asociaciones: readonly PasajeroServicio[],
  asistencias: readonly Asistencia[],
  pasajeros: readonly Pasajero[],
): FilaAsistenciaServicio[] {
  const personas = new Map(pasajeros.map((item) => [item.idPasajero, item]));
  const asistenciaPorPasajero = new Map<number, Asistencia>();
  for (const asistencia of asistencias) {
    const previa = asistenciaPorPasajero.get(asistencia.idPasajero);
    if (!previa || asistencia.fechaHora > previa.fechaHora) {
      asistenciaPorPasajero.set(asistencia.idPasajero, asistencia);
    }
  }

  const asociacionPorPasajero = new Map<number, PasajeroServicio>();
  for (const asociacion of asociaciones) {
    const previa = asociacionPorPasajero.get(asociacion.idPasajero);
    if (!previa || (previa.estado !== 'ACTIVO' && asociacion.estado === 'ACTIVO')) {
      asociacionPorPasajero.set(asociacion.idPasajero, asociacion);
    }
  }

  const filas: FilaAsistenciaServicio[] = [];
  const incluidos = new Set<number>();

  for (const asociacion of asociacionPorPasajero.values()) {
    if (asociacion.estado !== 'ACTIVO') {
      continue;
    }

    incluidos.add(asociacion.idPasajero);
    filas.push(
      filaDe(
        asociacion.idPasajero,
        'PLANIFICADO',
        asociacion.estadoConfirmacion,
        asistenciaPorPasajero.get(asociacion.idPasajero),
        personas.get(asociacion.idPasajero),
      ),
    );
  }

  for (const asistencia of asistenciaPorPasajero.values()) {
    if (incluidos.has(asistencia.idPasajero)) {
      continue;
    }

    filas.push(
      filaDe(
        asistencia.idPasajero,
        'NO_PLANIFICADO',
        null,
        asistencia,
        personas.get(asistencia.idPasajero),
      ),
    );
  }

  return filas.sort(compararFilas);
}

export function resumenAsistencia(filas: readonly FilaAsistenciaServicio[]): ResumenAsistenciaServicio {
  const total = filas.length;
  const efectivas = filas.filter((fila) => fila.estado === 'VALIDA').length;
  if (total === 0) {
    return { total, efectivas, porcentaje: '—' };
  }

  return {
    total,
    efectivas,
    porcentaje: `${Math.round((efectivas / total) * 100)}%`,
  };
}

export function etiquetaParticipacion(participacion: ParticipacionAsistencia): string {
  return participacion === 'NO_PLANIFICADO' ? 'No planificado' : 'Planificado';
}

function filaDe(
  idPasajero: number,
  participacion: ParticipacionAsistencia,
  confirmacion: EstadoConfirmacionViaje | null,
  asistencia: Asistencia | undefined,
  persona: Pasajero | undefined,
): FilaAsistenciaServicio {
  return {
    idPasajero,
    nombre: persona?.nombre ?? `Pasajero #${idPasajero}`,
    rut: persona?.rut ?? '—',
    participacion,
    confirmacion,
    estado: asistencia?.estado ?? null,
    metodo: asistencia?.metodo ?? null,
    fechaHora: asistencia?.fechaHora ?? null,
  };
}

function compararFilas(a: FilaAsistenciaServicio, b: FilaAsistenciaServicio): number {
  if (a.participacion !== b.participacion) {
    return a.participacion === 'PLANIFICADO' ? -1 : 1;
  }

  const porNombre = a.nombre.localeCompare(b.nombre, 'es');
  if (porNombre !== 0) {
    return porNombre;
  }

  return a.idPasajero - b.idPasajero;
}
