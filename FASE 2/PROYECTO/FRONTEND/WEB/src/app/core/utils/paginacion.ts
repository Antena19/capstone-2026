import { linkedSignal, signal, WritableSignal } from '@angular/core';

export const TAMANOS_PAGINA = [10, 25, 50] as const;
export type TamanoPagina = (typeof TAMANOS_PAGINA)[number];

export interface RangoPagina {
  pagina: number;
  paginas: number;
  desde: number;
  hasta: number;
}

export function esTamanoPagina(valor: number): valor is TamanoPagina {
  return valor === 10 || valor === 25 || valor === 50;
}

export function totalPaginas(total: number, tamano: number): number {
  if (total <= 0 || tamano <= 0) {
    return 1;
  }

  return Math.ceil(total / tamano);
}

export function paginaSegura(pagina: number, total: number, tamano: number): number {
  const maximo = totalPaginas(total, tamano);
  if (!Number.isFinite(pagina) || pagina < 1) {
    return 1;
  }

  return Math.min(Math.floor(pagina), maximo);
}

export function rangoPagina(total: number, pagina: number, tamano: number): RangoPagina {
  const actual = paginaSegura(pagina, total, tamano);
  if (total <= 0) {
    return { pagina: 1, paginas: 1, desde: 0, hasta: 0 };
  }

  const desde = (actual - 1) * tamano + 1;
  return {
    pagina: actual,
    paginas: totalPaginas(total, tamano),
    desde,
    hasta: Math.min(total, actual * tamano),
  };
}

export function recortarPagina<T>(items: readonly T[], pagina: number, tamano: number): T[] {
  if (items.length === 0 || tamano <= 0) {
    return [];
  }

  const actual = paginaSegura(pagina, items.length, tamano);
  const inicio = (actual - 1) * tamano;
  return items.slice(inicio, inicio + tamano);
}

/**
 * Paginación de una lista ya cargada en el navegador.
 * No reduce las llamadas al servidor: el listado completo sigue llegando
 * y aquí solo se recorta lo que se muestra.
 */
export class PaginacionLista<T> {
  readonly tamano = signal<TamanoPagina>(10);
  readonly pagina: WritableSignal<number>;

  constructor(
    private readonly origenDe: () => readonly T[],
    private readonly alCambiar?: () => string,
  ) {
    this.pagina = linkedSignal<{ clave: readonly T[] | string; total: number; tamano: number }, number>({
      source: () => ({
        clave: this.alCambiar ? this.alCambiar() : this.origenDe(),
        total: this.origenDe().length,
        tamano: this.tamano(),
      }),
      computation: (origen, anterior) => {
        const cambio =
          !anterior || origen.clave !== anterior.source.clave || origen.tamano !== anterior.source.tamano;
        if (cambio) {
          return 1;
        }

        return paginaSegura(anterior.value, origen.total, origen.tamano);
      },
    });
  }

  recortar(): T[] {
    return recortarPagina(this.origenDe(), this.pagina(), this.tamano());
  }

  ir(pagina: number): void {
    this.pagina.set(paginaSegura(pagina, this.origenDe().length, this.tamano()));
  }

  cambiarTamano(valor: number): void {
    if (!esTamanoPagina(valor) || valor === this.tamano()) {
      return;
    }

    this.tamano.set(valor);
  }
}
