import { EstadoConfirmacionViaje, EstadoServicio } from './servicio';

export type PeriodoReporte = 'MES' | 'SEMANA' | 'DIA';

export type ResultadoAsistenciaReporte = 'PRESENTE' | 'AUSENTE' | 'ANULADA' | 'PROVISIONAL';

export type TipoAsistenciaReporte = 'PLANIFICADA' | 'NO_PLANIFICADA';

export type EstadoAsistenciaReporte = 'VALIDA' | 'PROVISIONAL' | 'ANULADA';

export interface ReporteResumen {
  serviciosPlanificados: number;
  serviciosRealizados: number;
  serviciosCancelados: number;
  porcentajeServiciosRealizados: number;
  personasPlanificadas: number;
  planificadosTransportados: number;
  planificadosNoTransportados: number;
  noPlanificadosTransportados: number;
  totalTransportados: number;
  porcentajePlanificadosTransportados: number;
}

export interface ReporteServicio {
  idServicio: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: string;
  estado: EstadoServicio;
  idEmpresa: number;
  razonSocial: string;
  idRuta: string;
  nombreRuta: string | null;
  sectorRuta: string | null;
  patenteVehiculo: string | null;
  nombreConductor: string | null;
  capacidadVehiculo: number | null;
  personasPlanificadas: number;
  planificadosTransportados: number;
  planificadosNoTransportados: number;
  noPlanificadosTransportados: number;
  totalTransportados: number;
}

export interface ReportePasajeroServicio {
  idPasajero: number;
  nombre: string;
  rut: string;
  estabaPlanificado: boolean;
  estadoConfirmacion: EstadoConfirmacionViaje | null;
  tieneAsistencia: boolean;
  tipoAsistencia: TipoAsistenciaReporte | null;
  estadoAsistencia: EstadoAsistenciaReporte | null;
  resultado: ResultadoAsistenciaReporte;
  fechaHoraAsistencia: string | null;
  idPuntoRecogida: string | null;
  nombrePuntoRecogida: string | null;
  idServicio: number | null;
  fecha: string | null;
  nombreRuta: string | null;
}

export interface ReporteMensual {
  idEmpresa: number;
  razonSocial: string;
  periodo: string;
  resumen: ReporteResumen;
  servicios: ReporteServicio[];
}

export interface ReporteRango {
  desde: string;
  hasta: string;
  idEmpresa: number | null;
  razonSocial: string | null;
  resumen: ReporteResumen;
  servicios: ReporteServicio[];
}

export type ConsultaReporte =
  | { tipo: 'MES'; idEmpresa: number; periodo: string }
  | { tipo: 'DIA' | 'SEMANA'; idEmpresa: number; desde: string; hasta: string };

export interface ReporteOperacional {
  consulta: ConsultaReporte;
  razonSocial: string | null;
  resumen: ReporteResumen;
  servicios: ReporteServicio[];
}
