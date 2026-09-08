import { EstadoRegistro } from './empresa';

export type { EstadoRegistro };

export type EstadoAccesoPasajero = 'SIN_CUENTA' | 'PENDIENTE' | 'ENVIADA' | 'ERROR' | 'ACTIVADA';

export interface Pasajero {
  idPasajero: number;
  idEmpresa: number;
  idUsuario: number | null;
  nombre: string;
  rut: string;
  telefono: string;
  email: string | null;
  direccion: string;
  estado: EstadoRegistro;
  estadoAcceso: EstadoAccesoPasajero;
}

export interface PasajeroSolicitud {
  idEmpresa: number;
  idUsuario: number | null;
  nombre: string;
  rut: string;
  telefono: string;
  email?: string | null;
  direccion: string;
}

export interface PasajeroConCuentaSolicitud {
  idEmpresa: number;
  nombre: string;
  rut: string;
  telefono: string;
  email?: string | null;
  direccion: string;
}

export interface CambiarEstadoPasajeroSolicitud {
  estado: EstadoRegistro;
}

export interface HabilitarAccesoPasajeroSolicitud {
  email?: string | null;
}

export interface ColumnaExcel {
  indice: number;
  letra: string;
  nombre: string;
}

export interface MapeoColumnasImportacion {
  nombreColumna: number;
  rutColumna: number;
  telefonoColumna: number;
  emailColumna: number | null;
  direccionColumna: number;
}

export interface HojasImportacion {
  hojas: string[];
}

export interface EncabezadosImportacion {
  nombreHoja: string;
  encabezados: ColumnaExcel[];
  sugerencia: MapeoColumnasImportacion;
}

export interface FilaPreviewImportacion {
  numeroFila: number;
  nombre: string;
  rut: string;
  telefono: string;
  email: string | null;
  direccion: string;
  esValida: boolean;
  errores: string[];
}

export interface PreviewImportacionPasajeros {
  totalFilas: number;
  validas: number;
  invalidas: number;
  filas: FilaPreviewImportacion[];
}

export interface FilaOmitidaImportacion {
  numeroFila: number;
  errores: string[];
}

export interface EnvioErrorImportacion {
  idPasajero: number;
  telefono: string;
  mensaje: string;
}

export interface ResultadoImportacionPasajeros {
  totalFilas: number;
  creados: number;
  omitidos: number;
  activacionesEnviadas: number;
  activacionesError: number;
  filasOmitidas: FilaOmitidaImportacion[];
  enviosError: EnvioErrorImportacion[];
}
