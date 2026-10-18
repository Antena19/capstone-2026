import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaginacionLista } from './paginacion';
import {
  INTERVALO_REFRESCO_WEB_MS,
  RefrescoWeb,
  RelojIntervaloWeb,
  aplicarRefrescoDetalle,
  conservarListadoAnteError,
  planConsultasDetalle,
  presentarCargaListado,
} from './refresco-web';

describe('refresco operativo web', () => {
  it('inicia el intervalo de 30 segundos y lo detiene al salir', () => {
    const reloj = new RelojManual();
    const visibilidad = new VisibilidadManual();
    const cargas: boolean[] = [];
    const refresco = new RefrescoWeb((contexto) => cargas.push(contexto.automatico), reloj, visibilidad);

    refresco.iniciar();

    expect(reloj.ms).toBe(INTERVALO_REFRESCO_WEB_MS);
    expect(reloj.activo()).toBe(true);
    expect(cargas).toEqual([false]);

    refresco.completar(1);
    reloj.pulsar();
    expect(cargas).toEqual([false, true]);

    refresco.detener();
    expect(reloj.activo()).toBe(false);
    reloj.pulsar();
    expect(cargas).toEqual([false, true]);
  });

  it('detiene el intervalo al ocultar la pestaña y actualiza al volver', () => {
    const reloj = new RelojManual();
    const visibilidad = new VisibilidadManual();
    const cargas: boolean[] = [];
    const refresco = new RefrescoWeb((contexto) => cargas.push(contexto.automatico), reloj, visibilidad);

    refresco.iniciar(false);
    expect(cargas).toEqual([]);
    expect(reloj.activo()).toBe(true);

    visibilidad.cambiar(false);
    expect(reloj.activo()).toBe(false);
    reloj.pulsar();
    expect(cargas).toEqual([]);

    visibilidad.cambiar(true);
    expect(reloj.activo()).toBe(true);
    expect(cargas).toEqual([true]);
  });

  it('no lanza otra petición mientras hay una en curso y descarta la respuesta antigua', () => {
    const reloj = new RelojManual();
    const visibilidad = new VisibilidadManual();
    const generaciones: number[] = [];
    const refresco = new RefrescoWeb(
      (contexto) => generaciones.push(contexto.generacion),
      reloj,
      visibilidad,
    );

    refresco.iniciar();
    expect(generaciones).toEqual([1]);

    expect(refresco.solicitar(false, true)).toBe(false);
    reloj.pulsar();
    expect(generaciones).toEqual([1]);
    expect(refresco.esVigente(1)).toBe(false);

    refresco.completar(1);
    expect(generaciones).toEqual([1, 3]);
    expect(refresco.esVigente(1)).toBe(false);
    expect(refresco.esVigente(3)).toBe(true);
  });

  it('pausa durante un formulario y actualiza al reanudar', () => {
    const reloj = new RelojManual();
    const visibilidad = new VisibilidadManual();
    const cargas: boolean[] = [];
    const refresco = new RefrescoWeb((contexto) => cargas.push(contexto.automatico), reloj, visibilidad);

    refresco.iniciar();
    refresco.completar(1);
    refresco.pausar();
    expect(reloj.activo()).toBe(false);
    reloj.pulsar();
    expect(refresco.solicitar(true, false)).toBe(false);
    expect(cargas).toEqual([false]);

    refresco.reanudar();
    expect(reloj.activo()).toBe(true);
    expect(cargas).toEqual([false, true]);
  });

  it('conserva la página y los filtros cuando el listado se reemplaza', async () => {
    const fixture = TestBed.createComponent(HostListado);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await flush();

    host.fecha.set('2026-10-18');
    host.estado.set('EN_CURSO');
    await flush();
    host.paginacion.ir(2);
    expect(host.paginacion.pagina()).toBe(2);

    host.servicios.set(Array.from({ length: 30 }, (_, indice) => indice + 100));
    await flush();

    expect(host.fecha()).toBe('2026-10-18');
    expect(host.estado()).toBe('EN_CURSO');
    expect(host.paginacion.pagina()).toBe(2);
    expect(host.paginacion.recortar()[0]).toBe(110);
  });

  it('no muestra esqueleto ni borra el listado si falla el refresco automático', () => {
    expect(presentarCargaListado(true, true)).toEqual({ mostrarEsqueleto: false, limpiarError: false });
    expect(presentarCargaListado(false, true)).toEqual({ mostrarEsqueleto: false, limpiarError: false });
    expect(presentarCargaListado(true, false)).toEqual({ mostrarEsqueleto: true, limpiarError: true });
    expect(conservarListadoAnteError(true, true)).toBe(true);
    expect(conservarListadoAnteError(true, false)).toBe(false);
    expect(conservarListadoAnteError(false, true)).toBe(false);
  });

  it('refresca el detalle sin cerrarlo y sin volver a pedir la ruta conocida', () => {
    const actual = { abierto: true, estado: 'PROGRAMADO' };
    const siguiente = aplicarRefrescoDetalle(actual, { estado: 'EN_CURSO' });

    expect(siguiente.abierto).toBe(true);
    expect(siguiente.estado).toBe('EN_CURSO');
    expect(
      planConsultasDetalle({
        idRutaCargada: 'ruta-1',
        idRutaServicio: 'ruta-1',
        tieneNombreEmpresa: true,
        idsPasajerosConocidos: new Set([7, 8]),
        idsPasajerosAsociados: [7],
      }),
    ).toEqual({ ruta: false, empresa: false, catalogoPasajeros: false });
    expect(
      planConsultasDetalle({
        idRutaCargada: 'ruta-1',
        idRutaServicio: 'ruta-2',
        tieneNombreEmpresa: false,
        idsPasajerosConocidos: new Set([7]),
        idsPasajerosAsociados: [7, 9],
      }),
    ).toEqual({ ruta: true, empresa: true, catalogoPasajeros: true });
  });
});

@Component({ template: '' })
class HostListado {
  readonly servicios = signal<number[]>(Array.from({ length: 30 }, (_, indice) => indice + 1));
  readonly fecha = signal('');
  readonly estado = signal('');
  readonly paginacion = new PaginacionLista(
    () => this.servicios(),
    () => `${this.fecha()}|${this.estado()}`,
  );
}

class RelojManual implements RelojIntervaloWeb {
  ms = 0;
  private accion: (() => void) | null = null;

  cada(ms: number, accion: () => void): () => void {
    this.ms = ms;
    this.accion = accion;
    return () => {
      this.accion = null;
    };
  }

  pulsar(): void {
    this.accion?.();
  }

  activo(): boolean {
    return this.accion !== null;
  }
}

class VisibilidadManual {
  visible = true;
  private accion: ((visible: boolean) => void) | null = null;

  estaVisible(): boolean {
    return this.visible;
  }

  alCambiar(accion: (visible: boolean) => void): () => void {
    this.accion = accion;
    return () => {
      this.accion = null;
    };
  }

  cambiar(visible: boolean): void {
    this.visible = visible;
    this.accion?.(visible);
  }
}

async function flush(): Promise<void> {
  TestBed.flushEffects();
  await Promise.resolve();
}
