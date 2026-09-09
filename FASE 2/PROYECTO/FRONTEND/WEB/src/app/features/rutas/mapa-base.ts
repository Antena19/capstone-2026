import { setWorkerUrl } from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';

export const CENTRO_PUERTO_MONTT: [number, number] = [-72.9424, -41.4693];
export const ZOOM_CIUDAD = 12;
export const ZOOM_PASAJERO = 15;
export const SOURCE_TRAZADO = 'trayek-route-source';
export const LAYER_TRAZADO = 'trayek-route-line';
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
