export type AgrupacionEvolucion = 'DIA' | 'SEMANA';

export type PeriodoRapido = 'hoy' | 'semana' | 'mes' | 'personalizado';

export interface DashboardConsulta {
  idEmpresa: number | null;
  desde: string;
  hasta: string;
  agrupacion: AgrupacionEvolucion;
}

export interface DashboardResumen {
  desde: string;
  hasta: string;
  idEmpresa: number | null;
  serviciosPlanificados: number;
  serviciosRealizados: number;
  serviciosProgramados: number;
  serviciosEnCurso: number;
  serviciosCancelados: number;
  porcentajeServiciosRealizados: number;
  personasPlanificadas: number;
  planificadosTransportados: number;
  planificadosNoTransportados: number;
  noPlanificadosTransportados: number;
  totalTransportados: number;
  porcentajePlanificadosTransportados: number;
}

export interface DashboardEvolucionSerie {
  periodo: string;
  serviciosPlanificados: number;
  serviciosRealizados: number;
  personasPlanificadas: number;
  planificadosTransportados: number;
  noPlanificadosTransportados: number;
  totalTransportados: number;
}

export interface DashboardEvolucion {
  desde: string;
  hasta: string;
  agrupacion: AgrupacionEvolucion;
  series: DashboardEvolucionSerie[];
}

export interface DashboardEmpresa {
  idEmpresa: number;
  razonSocial: string;
  serviciosPlanificados: number;
  serviciosRealizados: number;
  porcentajeServiciosRealizados: number;
  personasPlanificadas: number;
  planificadosTransportados: number;
  noPlanificadosTransportados: number;
  totalTransportados: number;
  porcentajePlanificadosTransportados: number;
}
