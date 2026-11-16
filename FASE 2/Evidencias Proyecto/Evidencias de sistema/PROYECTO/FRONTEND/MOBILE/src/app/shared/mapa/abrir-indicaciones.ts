import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { urlIndicacionesDesdeLngLat } from './indicaciones-google';

export async function abrirIndicaciones(lngLat: [number, number]): Promise<void> {
  const url = urlIndicacionesDesdeLngLat(lngLat);
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
      return;
    } catch {
      abrirEnlace(url);
      return;
    }
  }

  abrirEnlace(url);
}

function abrirEnlace(url: string): void {
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.target = '_blank';
  enlace.rel = 'noopener noreferrer';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}
