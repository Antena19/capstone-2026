export type EstadoPlanificacion = 'BORRADOR' | 'ACTIVA' | 'CERRADA' | 'CANCELADA';

export interface Planificacion {
  idPlanificacion: number;
  idEmpresa: number;
  razonSocialEmpresa: string;
  periodo: string;
  fechaCreacion: string;
  idUsuarioCreador: number;
  emailUsuarioCreador: string | null;
  estado: EstadoPlanificacion;
}

export interface CrearPlanificacionSolicitud {
  idEmpresa: number;
  periodo: string;
}

export interface CambiarEstadoPlanificacionSolicitud {
  estado: Exclude<EstadoPlanificacion, 'BORRADOR'>;
}

export type EditarPlanificacionSolicitud = CrearPlanificacionSolicitud;
