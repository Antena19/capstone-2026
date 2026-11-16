export type MetodoAsistencia = 'QR' | 'MANUAL';
export type TipoAsistencia = 'PLANIFICADA' | 'NO_PLANIFICADA';
export type EstadoAsistencia = 'PROVISIONAL' | 'VALIDA' | 'ANULADA';

export interface AsistenciaRespuesta {
  idAsistencia: number;
  idServicio: number;
  idPasajero: number;
  fechaHora: string;
  metodo: MetodoAsistencia;
  tipoAsistencia: TipoAsistencia;
  excedeCapacidad: boolean;
  estado: EstadoAsistencia;
}
