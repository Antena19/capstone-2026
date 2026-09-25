import { EstadoAsistencia, EstadoConfirmacionViaje, EstadoServicio } from './conductor';

export interface FiltrosMisServiciosPasajero {
  fecha?: string;
  desde?: string;
  hasta?: string;
  estadoServicio?: EstadoServicio;
  estadoConfirmacion?: EstadoConfirmacionViaje;
}

export interface PuntoRecogidaPasajero {
  idPunto: string;
  nombre: string;
  referencia: string | null;
  orden: number;
}

export interface ServicioPasajeroResumen {
  idPasajeroServicio: number;
  idServicio: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: string;
  estadoServicio: EstadoServicio;
  estadoConfirmacion: EstadoConfirmacionViaje;
  fechaConfirmacion: string | null;
  idRuta: string;
  nombreRuta: string | null;
  sectorRuta: string | null;
  idPuntoRecogida: string | null;
  nombrePuntoRecogida: string | null;
  referenciaPuntoRecogida: string | null;
  ordenPuntoRecogida: number | null;
  tieneAsistencia: boolean;
  tipoAsistencia: string | null;
  estadoAsistencia: EstadoAsistencia | null;
  fechaHoraAsistencia: string | null;
}

export interface ProximoServicioPasajero {
  idPasajeroServicio: number;
  idServicio: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estadoServicio: EstadoServicio;
  tipoServicio: string;
  nombreRuta: string | null;
  sectorRuta: string | null;
  puntoRecogida: PuntoRecogidaPasajero | null;
  estadoConfirmacion: EstadoConfirmacionViaje;
  tieneAsistencia: boolean;
  estadoAsistencia: EstadoAsistencia | null;
}

export interface EmpresaServicioPasajero {
  idEmpresa: number;
  razonSocial: string;
}

export interface RutaServicioPasajeroResumen {
  idRuta: string;
  nombre: string;
  sector: string;
  distanciaEstimadaKm: number;
  duracionEstimadaMin: number;
}

export interface VehiculoServicioPasajero {
  patente: string;
  tipo: string;
  marca: string;
  modelo: string;
}

export interface AsistenciaPasajero {
  tieneAsistencia: boolean;
  metodo: string | null;
  tipoAsistencia: string | null;
  estadoAsistencia: EstadoAsistencia | null;
  fechaHora: string | null;
}

export interface ServicioPasajeroDetalle {
  idPasajeroServicio: number;
  idServicio: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  fechaHoraInicioReal: string | null;
  fechaHoraFinReal: string | null;
  tipoServicio: string;
  estado: EstadoServicio;
  empresa: EmpresaServicioPasajero;
  ruta: RutaServicioPasajeroResumen | null;
  puntoRecogida: PuntoRecogidaPasajero | null;
  estadoConfirmacion: EstadoConfirmacionViaje;
  fechaConfirmacion: string | null;
  asistencia: AsistenciaPasajero;
  vehiculo: VehiculoServicioPasajero | null;
}

export interface ConfirmacionViajeSolicitud {
  estadoConfirmacion: 'CONFIRMADO' | 'RECHAZADO';
}

export interface PasajeroServicioRespuesta {
  idPasajeroServicio: number;
  idServicio: number;
  idPasajero: number;
  idPuntoRecogida: string | null;
  estadoConfirmacion: EstadoConfirmacionViaje;
  fechaConfirmacion: string | null;
  estado: string;
}
