export interface PuntoGeoJson {
  type: string;
  coordinates: number[];
}

export interface LineaGeoJson {
  type: string;
  coordinates: number[][];
}

export interface PuntoRecogidaMapa {
  idPunto: string | null;
  nombre: string;
  referencia: string | null;
  orden: number;
  ubicacion: PuntoGeoJson | null;
}

export interface RutaMapa {
  idRuta: string;
  nombre: string;
  sector: string;
  origen: PuntoGeoJson | null;
  destino: PuntoGeoJson | null;
  puntosRecogida: PuntoRecogidaMapa[];
  trazado: LineaGeoJson | null;
  distanciaEstimadaKm: number;
  duracionEstimadaMin: number;
  estado: string;
  idPuntoRecogidaAsignado?: string | null;
}
