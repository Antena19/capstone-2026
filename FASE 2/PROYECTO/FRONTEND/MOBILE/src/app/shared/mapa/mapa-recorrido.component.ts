import { NgZone, Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { IonButton } from '@ionic/angular';
import { LngLatBounds, Map as MapaLibre, Marker, NavigationControl, Popup } from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import { RutaMapa } from '../../core/models/ruta-mapa';
import { abrirIndicaciones } from './abrir-indicaciones';
import {
  PuntoVisible,
  coordenadasParaEncuadre,
  coordenadasTrazado,
  estadoPuntoAsignado,
  puntosVisibles,
} from './geometria-ruta';
import {
  COLOR_TRAZADO,
  COLOR_TRAZADO_BORDE,
  ESTILO_MAPA_BASE,
  LAYER_TRAZADO,
  LAYER_TRAZADO_BORDE,
  SOURCE_TRAZADO,
  ZOOM_PASAJERO,
  configurarWorkerMapLibre,
} from './mapa-base';

type PerfilMapa = 'pasajero' | 'conductor';

@Component({
  selector: 'app-mapa-recorrido',
  templateUrl: './mapa-recorrido.component.html',
  styleUrl: './mapa-recorrido.component.scss',
  imports: [IonButton],
})
export class MapaRecorridoComponent implements OnDestroy {
  private readonly zona = inject(NgZone);
  private readonly lienzo = viewChild<ElementRef<HTMLDivElement>>('lienzo');
  private mapa: MapaLibre | null = null;
  private observador: ResizeObserver | null = null;
  private gestos: AbortController | null = null;
  private destruido = false;
  private encuadreListo = false;
  private firmaEncuadre = '';
  private tamanoVisto: { ancho: number; alto: number } | null = null;
  private readonly marcadores = new Map<string, { marker: Marker; elemento: HTMLButtonElement }>();
  private readonly reintentarTrazado = (): void => {
    const mapa = this.mapa;
    if (!mapa || this.destruido) {
      return;
    }

    this.dibujarTrazado(mapa, this.ruta(), false);
  };

  readonly ruta = input.required<RutaMapa>();
  readonly perfil = input.required<PerfilMapa>();
  readonly seleccionadoId = signal<string | null>(null);
  readonly abriendo = signal(false);
  readonly errorNavegacion = signal<string | null>(null);
  private readonly mapaListo = signal(false);

  readonly puntos = computed(() => puntosVisibles(this.ruta()));
  readonly estadoAsignacion = computed(() => estadoPuntoAsignado(this.ruta()));
  readonly trazadoDisponible = computed(() => coordenadasTrazado(this.ruta().trazado).length >= 2);
  readonly seleccionado = computed(
    () => this.puntos().find((punto) => punto.id === this.seleccionadoId()) ?? null,
  );
  readonly destinoNavegacion = computed((): [number, number] | null => {
    if (this.perfil() === 'pasajero') {
      return this.puntos().find((punto) => punto.asignado)?.lngLat ?? null;
    }

    return this.seleccionado()?.lngLat ?? null;
  });
  readonly distanciaVisible = computed(() => this.ruta().distanciaEstimadaKm > 0);
  readonly duracionVisible = computed(() => this.ruta().duracionEstimadaMin > 0);
  readonly nombreRuta = computed(() => this.ruta().nombre.trim() || 'Recorrido');
  readonly puntosSinCoordenadas = computed(() => this.puntos().filter((punto) => punto.lngLat == null));
  readonly textoSinCoordenadas = computed(() =>
    this.puntosSinCoordenadas()
      .map((punto) => punto.nombre)
      .join(', '),
  );
  readonly distanciaTexto = computed(() =>
    this.ruta().distanciaEstimadaKm.toLocaleString('es-CL', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }),
  );

  constructor() {
    afterNextRender(() => this.iniciarMapa());
    effect(() => {
      const ruta = this.ruta();
      if (!this.mapaListo()) {
        return;
      }

      untracked(() => this.dibujar(ruta));
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.gestos?.abort();
    this.observador?.disconnect();
    this.mapa?.off('styledata', this.reintentarTrazado);
    this.limpiarMarcadores();
    this.mapa?.remove();
    this.mapa = null;
  }

  elegir(id: string): void {
    const punto = this.puntos().find((item) => item.id === id);
    if (!punto?.lngLat || !this.mapa) {
      return;
    }

    this.seleccionadoId.set(id);
    this.aplicarSeleccion();
    for (const [clave, item] of this.marcadores) {
      const popup = item.marker.getPopup();
      if (!popup) {
        continue;
      }

      if (clave === id && !popup.isOpen()) {
        item.marker.togglePopup();
      }

      if (clave !== id && popup.isOpen()) {
        item.marker.togglePopup();
      }
    }

    this.mapa.easeTo({ center: punto.lngLat, duration: 400 });
  }

  centrarRecorrido(): void {
    const mapa = this.mapa;
    if (!mapa) {
      return;
    }

    mapa.resize();
    this.encuadrar(mapa, this.ruta(), 450);
    this.encuadreListo = true;
    this.firmaEncuadre = this.firmaDe(this.ruta());
  }

  async abrirNavegacion(): Promise<void> {
    const destino = this.destinoNavegacion();
    if (!destino || this.abriendo()) {
      return;
    }

    this.abriendo.set(true);
    this.errorNavegacion.set(null);
    try {
      await abrirIndicaciones(destino);
    } catch {
      this.errorNavegacion.set('No fue posible abrir Google Maps.');
    } finally {
      this.abriendo.set(false);
    }
  }

  private iniciarMapa(): void {
    const contenedor = this.lienzo()?.nativeElement;
    if (!contenedor || this.mapa || this.destruido) {
      return;
    }

    const centro = this.primerCentro(this.ruta());
    if (!centro) {
      return;
    }

    configurarWorkerMapLibre();
    this.zona.runOutsideAngular(() => {
      const mapa = new MapaLibre({
        container: contenedor,
        style: ESTILO_MAPA_BASE,
        center: centro,
        zoom: ZOOM_PASAJERO,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      mapa.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      mapa.dragPan.enable();
      mapa.scrollZoom.enable();
      mapa.touchZoomRotate.enable();
      mapa.touchZoomRotate.disableRotation();
      this.mapa = mapa;
      this.separarGestosDelScroll(contenedor);

      const alCargar = (): void => {
        if (this.destruido) {
          return;
        }

        this.zona.run(() => this.mapaListo.set(true));
        this.encuadrarCuandoHayaTamano(0);
      };

      if (mapa.loaded()) {
        alCargar();
      } else {
        mapa.once('load', alCargar);
      }
    });

    this.observador = new ResizeObserver(() => {
      if (this.encuadreListo) {
        this.mapa?.resize();
        return;
      }

      this.encuadrarCuandoHayaTamano(0);
    });
    this.observador.observe(contenedor);
  }

  private separarGestosDelScroll(contenedor: HTMLElement): void {
    this.gestos?.abort();
    this.gestos = new AbortController();
    const detener = (evento: Event): void => evento.stopPropagation();
    const opciones: AddEventListenerOptions = { passive: true, signal: this.gestos.signal };
    contenedor.addEventListener('touchstart', detener, opciones);
    contenedor.addEventListener('touchmove', detener, opciones);
    contenedor.addEventListener('pointerdown', detener, { signal: this.gestos.signal });
  }

  private dibujar(ruta: RutaMapa): void {
    const mapa = this.mapa;
    if (!mapa) {
      return;
    }

    this.limpiarMarcadores();
    for (const punto of puntosVisibles(ruta)) {
      if (!punto.lngLat) {
        continue;
      }

      const elemento = this.crearMarcador(punto);
      const marcador = new Marker({ element: elemento, anchor: 'center' })
        .setLngLat(punto.lngLat)
        .setPopup(new Popup({ offset: 18, closeButton: true, maxWidth: '240px' }).setDOMContent(this.crearPopup(punto)))
        .addTo(mapa);
      const contenedor = elemento.parentElement;
      if (contenedor) {
        contenedor.style.zIndex = punto.asignado ? '3' : '1';
      }

      this.marcadores.set(punto.id, { marker: marcador, elemento });
    }

    this.dibujarTrazado(mapa, ruta);
    this.aplicarSeleccion();
    const firma = this.firmaDe(ruta);
    if (firma !== this.firmaEncuadre) {
      this.firmaEncuadre = firma;
      this.encuadreListo = false;
      this.tamanoVisto = null;
    }

    this.encuadrarCuandoHayaTamano(0);
  }

  private crearMarcador(punto: PuntoVisible): HTMLButtonElement {
    const elemento = document.createElement('button');
    elemento.type = 'button';
    elemento.className = 'trayek-marcador';
    elemento.setAttribute('aria-label', this.etiquetaMarcador(punto));
    elemento.replaceChildren(this.crearCuerpoMarcador(punto));
    elemento.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      this.zona.run(() => this.elegir(punto.id));
    });
    return elemento;
  }

  private crearCuerpoMarcador(punto: PuntoVisible): HTMLSpanElement {
    const marca = document.createElement('span');
    marca.className = 'trayek-marca';
    if (punto.tipo === 'origen') {
      marca.classList.add('trayek-marca-inicio');
      marca.append(iconoInicio());
    } else if (punto.tipo === 'destino') {
      marca.classList.add('trayek-marca-destino');
      marca.append(iconoDestino());
    } else {
      marca.classList.add('trayek-marca-recogida');
      marca.textContent = String(punto.numero ?? '');
    }

    if (punto.asignado) {
      marca.classList.add('trayek-marca-asignado');
    }

    return marca;
  }

  private etiquetaMarcador(punto: PuntoVisible): string {
    if (punto.asignado) {
      return `Tu punto, parada ${punto.numero ?? ''}, ${punto.nombre}`;
    }

    if (punto.tipo === 'recogida') {
      return `Parada ${punto.numero ?? ''}, ${punto.nombre}`;
    }

    return punto.nombre;
  }

  private crearPopup(punto: PuntoVisible): HTMLElement {
    const contenedor = document.createElement('div');
    contenedor.className = 'trayek-mapa-popup';
    if (punto.asignado) {
      const rol = document.createElement('p');
      rol.className = 'rol';
      rol.textContent = 'Tu punto';
      contenedor.appendChild(rol);
    }

    const titulo = document.createElement('strong');
    titulo.textContent = punto.nombre;
    contenedor.appendChild(titulo);
    if (punto.referencia) {
      const referencia = document.createElement('p');
      referencia.textContent = punto.referencia;
      contenedor.appendChild(referencia);
    }

    return contenedor;
  }

  private dibujarTrazado(mapa: MapaLibre, ruta: RutaMapa, reintentar = true): void {
    const coordinates = coordenadasTrazado(ruta.trazado);
    try {
      if (coordinates.length < 2) {
        if (mapa.getLayer(LAYER_TRAZADO)) {
          mapa.removeLayer(LAYER_TRAZADO);
        }

        if (mapa.getLayer(LAYER_TRAZADO_BORDE)) {
          mapa.removeLayer(LAYER_TRAZADO_BORDE);
        }

        if (mapa.getSource(SOURCE_TRAZADO)) {
          mapa.removeSource(SOURCE_TRAZADO);
        }

        return;
      }

      const feature = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates,
        },
      };
      const fuente = mapa.getSource(SOURCE_TRAZADO) as GeoJSONSource | undefined;
      if (fuente) {
        fuente.setData(feature);
      } else {
        mapa.addSource(SOURCE_TRAZADO, { type: 'geojson', data: feature });
      }

      if (!mapa.getLayer(LAYER_TRAZADO_BORDE)) {
        mapa.addLayer({
          id: LAYER_TRAZADO_BORDE,
          type: 'line',
          source: SOURCE_TRAZADO,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': COLOR_TRAZADO_BORDE,
            'line-width': 10,
            'line-opacity': 1,
          },
        });
      }

      if (!mapa.getLayer(LAYER_TRAZADO)) {
        mapa.addLayer({
          id: LAYER_TRAZADO,
          type: 'line',
          source: SOURCE_TRAZADO,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': COLOR_TRAZADO,
            'line-width': 6,
            'line-opacity': 1,
          },
        });
      }

      if (mapa.getLayer(LAYER_TRAZADO_BORDE)) {
        mapa.moveLayer(LAYER_TRAZADO_BORDE);
      }

      if (mapa.getLayer(LAYER_TRAZADO)) {
        mapa.moveLayer(LAYER_TRAZADO);
      }
    } catch {
      if (reintentar) {
        mapa.once('styledata', this.reintentarTrazado);
      }
    }
  }

  private encuadrarCuandoHayaTamano(duracion: number): void {
    const mapa = this.mapa;
    const contenedor = this.lienzo()?.nativeElement;
    if (!mapa || !contenedor || this.destruido || this.encuadreListo) {
      return;
    }

    const ancho = contenedor.clientWidth;
    const alto = contenedor.clientHeight;
    if (ancho < 240 || alto < 260) {
      return;
    }

    mapa.resize();
    const canvas = mapa.getCanvas();
    if (canvas.clientWidth < ancho * 0.9 || canvas.clientHeight < alto * 0.9) {
      return;
    }

    const previo = this.tamanoVisto;
    this.tamanoVisto = { ancho, alto };
    if (!previo || Math.abs(previo.ancho - ancho) > 1 || Math.abs(previo.alto - alto) > 1) {
      requestAnimationFrame(() => this.encuadrarCuandoHayaTamano(duracion));
      return;
    }

    this.encuadrar(mapa, this.ruta(), duracion);
    this.encuadreListo = true;
  }

  private encuadrar(mapa: MapaLibre, ruta: RutaMapa, duracion: number): void {
    const puntos = coordenadasParaEncuadre(ruta);
    if (puntos.length === 0) {
      return;
    }

    if (puntos.length === 1) {
      mapa.easeTo({ center: puntos[0], zoom: ZOOM_PASAJERO, duration: duracion });
      return;
    }

    const bounds = new LngLatBounds(puntos[0], puntos[0]);
    for (const punto of puntos) {
      bounds.extend(punto);
    }

    const contenedor = this.lienzo()?.nativeElement;
    mapa.fitBounds(bounds, {
      padding: this.paddingEncuadre(contenedor),
      maxZoom: ZOOM_PASAJERO,
      duration: duracion,
    });
  }

  private paddingEncuadre(contenedor: HTMLElement | undefined): { top: number; bottom: number; left: number; right: number } {
    const ancho = contenedor?.clientWidth ?? 320;
    const alto = contenedor?.clientHeight ?? 320;
    const vertical = Math.max(20, Math.min(36, Math.floor(alto * 0.1)));
    const horizontal = Math.max(16, Math.min(28, Math.floor(ancho * 0.08)));
    return { top: vertical, bottom: vertical, left: horizontal, right: horizontal };
  }

  private firmaDe(ruta: RutaMapa): string {
    const puntos = coordenadasParaEncuadre(ruta);
    const primero = puntos[0];
    const ultimo = puntos[puntos.length - 1];
    return `${puntos.length}:${primero?.[0] ?? ''}:${primero?.[1] ?? ''}:${ultimo?.[0] ?? ''}:${ultimo?.[1] ?? ''}`;
  }

  private aplicarSeleccion(): void {
    const id = this.seleccionadoId();
    for (const [clave, item] of this.marcadores) {
      const activo = clave === id;
      item.elemento.classList.toggle('trayek-marcador-seleccionado', activo);
      item.elemento.setAttribute('aria-pressed', activo ? 'true' : 'false');
      const contenedor = item.elemento.parentElement;
      if (contenedor) {
        contenedor.style.zIndex = activo ? '5' : item.elemento.querySelector('.trayek-marca-asignado') ? '3' : '1';
      }
    }
  }

  private limpiarMarcadores(): void {
    for (const item of this.marcadores.values()) {
      item.marker.remove();
    }

    this.marcadores.clear();
  }

  private primerCentro(ruta: RutaMapa): [number, number] | null {
    return (
      coordenadasTrazado(ruta.trazado)[0] ??
      puntosVisibles(ruta).find((punto) => punto.lngLat)?.lngLat ??
      null
    );
  }
}

function iconoSvg(dibujo: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const trazo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  trazo.setAttribute('fill', 'currentColor');
  trazo.setAttribute('d', dibujo);
  svg.append(trazo);
  return svg;
}

function iconoInicio(): SVGSVGElement {
  return iconoSvg('M6 3.2h1.7v17.6H6zm1.7.6h10.1l-2.5 4.3 2.5 4.3H7.7z');
}

function iconoDestino(): SVGSVGElement {
  return iconoSvg('M12 2.2a6.3 6.3 0 0 0-6.3 6.3c0 4.7 6.3 12.1 6.3 12.1s6.3-7.4 6.3-12.1A6.3 6.3 0 0 0 12 2.2zm0 8.5a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z');
}
