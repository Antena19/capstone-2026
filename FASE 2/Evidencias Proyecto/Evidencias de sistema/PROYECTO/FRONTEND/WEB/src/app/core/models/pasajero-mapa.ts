export type EstadoGeocodificacion = 'PENDIENTE' | 'GEOCODIFICADO' | 'ERROR';

export interface PasajeroMapa {
  idPasajero: number;
  nombre: string;
  rut: string;
  telefono: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  direccionGeocodificada: string | null;
  fechaGeocodificacion: string | null;
  estadoGeocodificacion: EstadoGeocodificacion;
}

export interface ItemGeocodificacionLote {
  idPasajero: number;
  nombre: string;
  estado: EstadoGeocodificacion;
  latitud: number | null;
  longitud: number | null;
  mensaje: string | null;
}

export interface ResultadoGeocodificacionLote {
  totalPendientes: number;
  geocodificados: number;
  errores: number;
  resultados: ItemGeocodificacionLote[];
}

export interface GeocodificarPendientesSolicitud {
  idEmpresa: number;
}
