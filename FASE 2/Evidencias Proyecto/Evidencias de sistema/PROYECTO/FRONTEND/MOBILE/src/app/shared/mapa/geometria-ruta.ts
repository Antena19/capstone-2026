import { LineaGeoJson, PuntoGeoJson, RutaMapa } from '../../core/models/ruta-mapa';

export type TipoPuntoMapa = 'origen' | 'destino' | 'recogida';
export type EstadoPuntoAsignado = 'sin-asignar' | 'no-encontrado' | 'sin-coordenadas' | 'listo';

export interface PuntoVisible {
  id: string;
  tipo: TipoPuntoMapa;
  nombre: string;
  referencia: string | null;
  orden: number | null;
  numero: number | null;
  lngLat: [number, number] | null;
  asignado: boolean;
}

export function posicionGeoJson(punto: PuntoGeoJson | null | undefined): [number, number] | null {
  const coordenadas = punto?.coordinates;
  if (!coordenadas || coordenadas.length < 2) {
    return null;
  }

  const longitud = Number(coordenadas[0]);
  const latitud = Number(coordenadas[1]);
  if (!Number.isFinite(longitud) || !Number.isFinite(latitud)) {
    return null;
  }

  if (longitud < -180 || longitud > 180 || latitud < -90 || latitud > 90) {
    return null;
  }

  return [longitud, latitud];
}

export function coordenadasTrazado(trazado: LineaGeoJson | null | undefined): [number, number][] {
  return (trazado?.coordinates ?? []).flatMap((posicion) => {
    const punto = posicionGeoJson({ type: 'Point', coordinates: posicion });
    return punto ? [punto] : [];
  });
}

export function puntosVisibles(ruta: RutaMapa): PuntoVisible[] {
  const asignadoId = ruta.idPuntoRecogidaAsignado?.trim().toLowerCase() ?? '';
  const recogidas = [...(ruta.puntosRecogida ?? [])].sort((a, b) => a.orden - b.orden);
  const puntos: PuntoVisible[] = [
    {
      id: 'origen',
      tipo: 'origen',
      nombre: 'Inicio',
      referencia: null,
      orden: null,
      numero: null,
      lngLat: posicionGeoJson(ruta.origen),
      asignado: false,
    },
  ];

  recogidas.forEach((punto, indice) => {
    const idPunto = punto.idPunto?.trim() ?? '';
    const numero = punto.orden > 0 ? punto.orden : indice + 1;
    puntos.push({
      id: idPunto ? `recogida:${idPunto}` : `recogida:${indice}`,
      tipo: 'recogida',
      nombre: punto.nombre?.trim() || 'Punto de recogida',
      referencia: punto.referencia?.trim() || null,
      orden: punto.orden,
      numero,
      lngLat: posicionGeoJson(punto.ubicacion),
      asignado: idPunto.length > 0 && idPunto.toLowerCase() === asignadoId,
    });
  });

  puntos.push({
    id: 'destino',
    tipo: 'destino',
    nombre: 'Destino',
    referencia: null,
    orden: null,
    numero: null,
    lngLat: posicionGeoJson(ruta.destino),
    asignado: false,
  });

  return puntos;
}

export function coordenadasParaEncuadre(ruta: RutaMapa): [number, number][] {
  const marcas = puntosVisibles(ruta).flatMap((punto) => (punto.lngLat ? [punto.lngLat] : []));
  return [...coordenadasTrazado(ruta.trazado), ...marcas];
}

export function tieneGeometria(ruta: RutaMapa | null | undefined): boolean {
  if (!ruta) {
    return false;
  }

  if (coordenadasTrazado(ruta.trazado).length >= 2) {
    return true;
  }

  return puntosVisibles(ruta).some((punto) => punto.lngLat != null);
}

export function puntoAsignado(ruta: RutaMapa): PuntoVisible | null {
  return puntosVisibles(ruta).find((punto) => punto.asignado) ?? null;
}

export function estadoPuntoAsignado(ruta: RutaMapa): EstadoPuntoAsignado {
  const id = ruta.idPuntoRecogidaAsignado?.trim();
  if (!id) {
    return 'sin-asignar';
  }

  const punto = puntoAsignado(ruta);
  if (!punto) {
    return 'no-encontrado';
  }

  return punto.lngLat ? 'listo' : 'sin-coordenadas';
}
