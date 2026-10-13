import { EstadoPlanificacion } from '../../core/models/planificacion';

export function planificacionPermiteAdministrar(estado: EstadoPlanificacion | null | undefined): boolean {
  return estado === 'ACTIVA' || estado === 'BORRADOR';
}
