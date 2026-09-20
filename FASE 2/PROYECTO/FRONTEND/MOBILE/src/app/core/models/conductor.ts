export type EstadoServicio = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';

export interface ServicioConductorResumen {
  idServicio: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: string;
  estado: EstadoServicio;
  idRuta: string;
  nombreRuta: string | null;
  sectorRuta: string | null;
  idVehiculo: number;
  patenteVehiculo: string;
  tipoVehiculo: string;
}

export interface EmpresaServicioConductor {
  idEmpresa: number;
  razonSocial: string;
}

export interface VehiculoServicioConductor {
  idVehiculo: number;
  patente: string;
  tipo: string;
  marca: string;
  modelo: string;
  capacidad: number;
}

export interface RutaServicioConductorResumen {
  idRuta: string;
  nombre: string;
  sector: string;
  distanciaEstimadaKm: number;
  duracionEstimadaMin: number;
}

export interface ResumenPasajerosServicio {
  totalPlanificados: number;
  totalConfirmados: number;
  totalPendientes: number;
  totalRechazados: number;
  totalAsistenciasValidas: number;
  totalNoPlanificados: number;
  totalProvisionales: number;
}

export interface ServicioConductorDetalle {
  idServicio: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  fechaHoraInicioReal: string | null;
  fechaHoraFinReal: string | null;
  tipoServicio: string;
  estado: EstadoServicio;
  empresa: EmpresaServicioConductor;
  vehiculo: VehiculoServicioConductor;
  ruta: RutaServicioConductorResumen | null;
  resumenPasajeros: ResumenPasajerosServicio;
}

export interface ServicioRespuesta {
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

export type EstadoQrServicio = 'ACTIVO' | 'EXPIRADO' | 'INVALIDADO';

export interface QrServicioRespuesta {
  idQr: number;
  idServicio: number;
  token: string;
  fechaGeneracion: string;
  fechaExpiracion: string;
  estado: EstadoQrServicio;
}

export type TipoParticipacionConductor = 'PLANIFICADO' | 'NO_PLANIFICADO';
export type EstadoConfirmacionViaje = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO';
export type EstadoPasajeroServicio = 'ACTIVO' | 'CANCELADO';
export type TipoAsistencia = 'PLANIFICADA' | 'NO_PLANIFICADA';
export type EstadoAsistencia = 'PROVISIONAL' | 'VALIDA' | 'ANULADA';

export interface PuntoGeoJson {
  type: string;
  coordinates: number[];
}

export interface PasajeroServicioConductor {
  idPasajero: number;
  nombre: string;
  tipoParticipacion: TipoParticipacionConductor;
  estadoConfirmacion: EstadoConfirmacionViaje | null;
  fechaConfirmacion: string | null;
  estadoPasajeroServicio: EstadoPasajeroServicio | null;
  tieneAsistencia: boolean;
  tipoAsistencia: TipoAsistencia | null;
  estadoAsistencia: EstadoAsistencia | null;
  fechaHoraAsistencia: string | null;
  idPuntoRecogida: string | null;
  nombrePuntoRecogida: string | null;
  referenciaPuntoRecogida: string | null;
  ordenPuntoRecogida: number | null;
  ubicacionPuntoRecogida: PuntoGeoJson | null;
}
