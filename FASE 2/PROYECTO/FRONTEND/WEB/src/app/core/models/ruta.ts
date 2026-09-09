export interface PuntoGeoJson {
  type: string;
  coordinates: number[];
}

export interface LineaGeoJson {
  type: 'LineString';
  coordinates: number[][];
}

export interface ExtremoRuta {
  nombre: string;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  ubicacion: PuntoGeoJson | null;
}

export interface PuntoRecogida {
  idPunto: string;
  nombre: string;
  referencia: string | null;
  orden: number;
  ubicacion: PuntoGeoJson;
  pasajerosIds: number[];
  cantidadPasajeros: number;
  latitud: number | null;
  longitud: number | null;
}

export interface Ruta {
  idRuta: string;
  nombre: string;
  empresaId: number;
  sector: string;
  origen: ExtremoRuta | null;
  destino: ExtremoRuta | null;
  puntosRecogida: PuntoRecogida[];
  trazado: LineaGeoJson | null;
  distanciaEstimadaKm: number;
  duracionEstimadaMin: number;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface CrearRutaDisenoSolicitud {
  nombre: string;
  empresaId: number;
  sector?: string | null;
}

export interface CrearPuntoSolicitud {
  nombre: string;
  referencia?: string | null;
  orden?: number;
  ubicacion: PuntoGeoJson;
}

export interface DefinirExtremoSolicitud {
  nombre: string;
  referencia?: string | null;
  latitud: number;
  longitud: number;
}

export interface AsignarPasajerosSolicitud {
  pasajerosIds: number[];
}

export interface ReordenarPuntosSolicitud {
  puntos: { idPunto: string; orden: number }[];
}
