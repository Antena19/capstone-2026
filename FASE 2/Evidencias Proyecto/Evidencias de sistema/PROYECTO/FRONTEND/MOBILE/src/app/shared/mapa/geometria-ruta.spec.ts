import { RutaMapa } from '../../core/models/ruta-mapa';
import {
  coordenadasParaEncuadre,
  coordenadasTrazado,
  estadoPuntoAsignado,
  posicionGeoJson,
  puntosVisibles,
  tieneGeometria,
} from './geometria-ruta';
import { urlIndicacionesDesdeLngLat } from './indicaciones-google';

const rutaBase = (): RutaMapa => ({
  idRuta: 'abc',
  nombre: 'Norte',
  sector: 'Puerto Montt',
  origen: { type: 'Point', coordinates: [-72.95, -41.47] },
  destino: { type: 'Point', coordinates: [-72.9, -41.45] },
  puntosRecogida: [
    {
      idPunto: 'PR-2',
      nombre: 'Colegio',
      referencia: 'Frente a la plaza',
      orden: 2,
      ubicacion: { type: 'Point', coordinates: [-72.93, -41.46] },
    },
    {
      idPunto: 'PR-1',
      nombre: 'Paradero',
      referencia: null,
      orden: 1,
      ubicacion: { type: 'Point', coordinates: [-72.94, -41.465] },
    },
  ],
  trazado: {
    type: 'LineString',
    coordinates: [
      [-72.95, -41.47],
      [-72.94, -41.465],
      [-72.9, -41.45],
    ],
  },
  distanciaEstimadaKm: 4.2,
  duracionEstimadaMin: 12,
  estado: 'ACTIVO',
  idPuntoRecogidaAsignado: 'PR-1',
});

describe('geometria de ruta', () => {
  it('lee GeoJSON como longitud y luego latitud', () => {
    expect(posicionGeoJson({ type: 'Point', coordinates: [-72.9424, -41.4693] })).toEqual([
      -72.9424,
      -41.4693,
    ]);
    expect(posicionGeoJson({ type: 'Point', coordinates: [] })).toBeNull();
    expect(posicionGeoJson({ type: 'Point', coordinates: [200, 0] })).toBeNull();
  });

  it('detecta geometría real y descarta una ruta vacía', () => {
    expect(tieneGeometria(rutaBase())).toBe(true);
    expect(
      tieneGeometria({
        ...rutaBase(),
        origen: { type: 'Point', coordinates: [] },
        destino: { type: 'Point', coordinates: [] },
        puntosRecogida: [],
        trazado: { type: 'LineString', coordinates: [] },
      }),
    ).toBe(false);
    expect(coordenadasTrazado(rutaBase().trazado)).toHaveLength(3);
  });

  it('encuadra con longitud,latitud e incluye el trazado y los marcadores', () => {
    const coordenadas = coordenadasParaEncuadre(rutaBase());
    expect(coordenadas[0]).toEqual([-72.95, -41.47]);
    expect(coordenadas).toContainEqual([-72.94, -41.465]);
    expect(coordenadas).toContainEqual([-72.9, -41.45]);
  });

  it('numera los puntos según su orden y marca el asignado', () => {
    const recogidas = puntosVisibles(rutaBase()).filter((punto) => punto.tipo === 'recogida');
    expect(recogidas.map((punto) => punto.numero)).toEqual([1, 2]);
    expect(recogidas[0]?.asignado).toBe(true);
    expect(estadoPuntoAsignado(rutaBase())).toBe('listo');
    expect(estadoPuntoAsignado({ ...rutaBase(), idPuntoRecogidaAsignado: null })).toBe('sin-asignar');
    expect(
      estadoPuntoAsignado({
        ...rutaBase(),
        puntosRecogida: [
          {
            ...rutaBase().puntosRecogida[1],
            ubicacion: { type: 'Point', coordinates: [] },
          },
        ],
      }),
    ).toBe('sin-coordenadas');
  });
});

describe('indicaciones de Google Maps', () => {
  it('abre la URL oficial de indicaciones hacia latitud,longitud', () => {
    const url = new URL(urlIndicacionesDesdeLngLat([-72.9424, -41.4693]));

    expect(`${url.origin}${url.pathname}`).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('travelmode')).toBe('driving');
    expect(url.searchParams.get('destination')).toBe('-41.469300,-72.942400');
    expect(url.searchParams.get('waypoints')).toBeNull();
  });
});
