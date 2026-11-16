export type EstadoAsignacionServicio = 'ACTIVA' | 'REEMPLAZADA' | 'CANCELADA';

export interface AsignacionServicio {
  idAsignacion: number;
  idServicio: number;
  idConductor: number;
  idVehiculo: number;
  fechaAsignacion: string;
  estado: EstadoAsignacionServicio;
}

export interface FiltrosAsignacion {
  idServicio?: number;
  idConductor?: number;
  idVehiculo?: number;
  estado?: EstadoAsignacionServicio;
}

export interface CrearAsignacionSolicitud {
  idServicio: number;
  idConductor: number;
  idVehiculo: number;
}

export interface ReemplazarAsignacionSolicitud {
  idConductor?: number | null;
  idVehiculo?: number | null;
}
