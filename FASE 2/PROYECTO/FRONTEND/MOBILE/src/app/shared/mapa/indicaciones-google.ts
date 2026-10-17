function formatearCoordenada(valor: number): string {
  return valor.toFixed(6);
}

export function urlIndicacionesGoogleMaps(latitud: number, longitud: number): string {
  const destino = `${formatearCoordenada(latitud)},${formatearCoordenada(longitud)}`;
  const parametros = new URLSearchParams({
    api: '1',
    destination: destino,
    travelmode: 'driving',
  });

  return `https://www.google.com/maps/dir/?${parametros.toString()}`;
}

export function urlIndicacionesDesdeLngLat(lngLat: [number, number]): string {
  const [longitud, latitud] = lngLat;
  return urlIndicacionesGoogleMaps(latitud, longitud);
}
