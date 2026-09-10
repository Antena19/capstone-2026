export type EstadoServicio = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';

export type TipoServicio = 'IDA' | 'REGRESO' | 'ESPECIAL';

export type DiaSemana =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

export type ModalidadServicio = 'individual' | 'recurrente';

export interface Servicio {
  idServicio: number;
  idEmpresa: number;
  idPlanificacion: number;
  idRuta: string;
  idSerie: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  fechaHoraInicioReal: string | null;
  fechaHoraFinReal: string | null;
  tipoServicio: string;
  estado: EstadoServicio;
}

export type EstadoPasajeroServicio = 'ACTIVO' | 'CANCELADO';

export type EstadoConfirmacionViaje = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO';

export interface PasajeroServicio {
  idPasajeroServicio: number;
  idServicio: number;
  idPasajero: number;
  idPuntoRecogida: string | null;
  estadoConfirmacion: EstadoConfirmacionViaje;
  fechaConfirmacion: string | null;
  estado: EstadoPasajeroServicio;
}

export interface FiltrosPasajeroServicio {
  idServicio?: number;
  idPasajero?: number;
  estado?: EstadoPasajeroServicio;
  estadoConfirmacion?: EstadoConfirmacionViaje;
}

export interface FiltrosServicio {
  idEmpresa?: number;
  idPlanificacion?: number;
  fecha?: string;
  estado?: EstadoServicio;
  tipoServicio?: TipoServicio;
}

export interface CrearServicioSolicitud {
  idEmpresa: number;
  idPlanificacion: number;
  idRuta: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: TipoServicio;
}

export interface PasajeroServicioInicial {
  idPasajero: number;
  idPuntoRecogida: string;
}

export interface CrearPasajerosServicioLoteSolicitud {
  idServicio: number;
  pasajeros: PasajeroServicioInicial[];
}

export interface CrearServiciosRecurrentesSolicitud {
  idEmpresa: number;
  idPlanificacion: number;
  idRuta: string;
  fechaDesde: string;
  fechaHasta: string;
  diasSemana: DiaSemana[];
  horaInicio: string;
  horaFin: string;
  tipoServicio: TipoServicio;
  pasajeros: PasajeroServicioInicial[];
}

export interface CrearServiciosRecurrentesRespuesta {
  idSerie: string;
  cantidadServicios: number;
  servicios: Servicio[];
}

export type AltaServicio =
  | {
      modalidad: 'individual';
      solicitud: CrearServicioSolicitud;
      pasajeros: PasajeroServicioInicial[];
    }
  | { modalidad: 'recurrente'; solicitud: CrearServiciosRecurrentesSolicitud };

export type AlcanceEdicionSerie = 'ESTE' | 'ESTE_Y_FUTUROS' | 'TODOS_PROGRAMADOS';

export interface EditarServicioSolicitud {
  idEmpresa: number;
  idPlanificacion: number;
  idRuta: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: TipoServicio;
}

export interface EditarSerieServiciosSolicitud {
  alcance: AlcanceEdicionSerie;
  idRuta: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: TipoServicio;
}

export type EdicionServicio =
  | { tipo: 'individual'; idServicio: number; solicitud: EditarServicioSolicitud }
  | { tipo: 'serie'; idServicio: number; solicitud: EditarSerieServiciosSolicitud };

export interface CambiarEstadoServicioSolicitud {
  estado: EstadoServicio;
}

export interface CambiarEstadoSerieServiciosSolicitud {
  alcance: AlcanceEdicionSerie;
  estado: 'CANCELADO';
}

export type CancelacionServicio =
  | { tipo: 'individual'; idServicio: number }
  | { tipo: 'serie'; idServicio: number; alcance: AlcanceEdicionSerie };

export interface AsignarPuntoRecogidaSolicitud {
  idPuntoRecogida: string | null;
}

export interface CambiarEstadoPasajeroServicioSolicitud {
  estado: EstadoPasajeroServicio;
}

