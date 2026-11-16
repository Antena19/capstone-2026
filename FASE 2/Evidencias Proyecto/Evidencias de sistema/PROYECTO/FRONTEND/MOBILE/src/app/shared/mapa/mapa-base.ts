import { setWorkerUrl } from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';

export const ZOOM_CIUDAD = 12;
export const ZOOM_PASAJERO = 15;
export const SOURCE_TRAZADO = 'trayek-route-source';
export const LAYER_TRAZADO_BORDE = 'trayek-route-casing';
export const LAYER_TRAZADO = 'trayek-route-line';
export const COLOR_TRAZADO = '#9b555b';
export const COLOR_TRAZADO_BORDE = '#ffffff';
export const URL_WORKER_MAPLIBRE = 'maplibre/maplibre-gl-worker.mjs';

let workerConfigurado = false;

export function configurarWorkerMapLibre(): void {
  if (workerConfigurado) {
    return;
  }

  setWorkerUrl(new URL(URL_WORKER_MAPLIBRE, document.baseURI).href);
  workerConfigurado = true;
}

export const ESTILO_MAPA_BASE: StyleSpecification = {
  version: 8,
  name: 'osm-raster',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};
