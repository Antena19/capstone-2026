import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaginacionLista, rangoPagina, recortarPagina, totalPaginas } from './paginacion';

@Component({ template: '' })
class HostPaginacion {
  readonly items = signal<number[]>([]);
  readonly clave = signal('inicial');
  readonly paginacion = new PaginacionLista(
    () => this.items(),
    () => this.clave(),
  );
}

@Component({ template: '' })
class HostPorOrigen {
  readonly items = signal<number[]>(Array.from({ length: 30 }, (_, indice) => indice + 1));
  readonly paginacion = new PaginacionLista(() => this.items());
}

describe('paginación local', () => {
  const registros = (cantidad: number) => Array.from({ length: cantidad }, (_, indice) => indice + 1);

  async function aplicar(): Promise<void> {
    TestBed.flushEffects();
    await Promise.resolve();
  }

  it('cubre listados vacíos y de un registro', () => {
    expect(rangoPagina(0, 1, 10)).toEqual({ pagina: 1, paginas: 1, desde: 0, hasta: 0 });
    expect(recortarPagina(registros(0), 1, 10)).toEqual([]);
    expect(rangoPagina(1, 1, 10)).toEqual({ pagina: 1, paginas: 1, desde: 1, hasta: 1 });
    expect(recortarPagina(registros(1), 4, 10)).toEqual([1]);
  });

  it('separa 10, 11, 25, 50 y más de 50 registros', () => {
    expect(totalPaginas(10, 10)).toBe(1);
    expect(recortarPagina(registros(10), 1, 10)).toEqual(registros(10));

    expect(rangoPagina(11, 1, 10)).toEqual({ pagina: 1, paginas: 2, desde: 1, hasta: 10 });
    expect(rangoPagina(11, 2, 10)).toEqual({ pagina: 2, paginas: 2, desde: 11, hasta: 11 });
    expect(recortarPagina(registros(11), 2, 10)).toEqual([11]);

    expect(rangoPagina(25, 1, 25)).toEqual({ pagina: 1, paginas: 1, desde: 1, hasta: 25 });
    expect(rangoPagina(25, 2, 10)).toEqual({ pagina: 2, paginas: 3, desde: 11, hasta: 20 });
    expect(rangoPagina(25, 3, 10)).toEqual({ pagina: 3, paginas: 3, desde: 21, hasta: 25 });

    expect(totalPaginas(50, 50)).toBe(1);
    expect(totalPaginas(50, 10)).toBe(5);
    expect(rangoPagina(51, 2, 50)).toEqual({ pagina: 2, paginas: 2, desde: 51, hasta: 51 });
    expect(rangoPagina(248, 1, 10)).toEqual({ pagina: 1, paginas: 25, desde: 1, hasta: 10 });
    expect(rangoPagina(248, 25, 10)).toEqual({ pagina: 25, paginas: 25, desde: 241, hasta: 248 });
  });

  it('vuelve a la primera página al cambiar el listado o el tamaño', async () => {
    const fixture = TestBed.createComponent(HostPaginacion);
    const host = fixture.componentInstance;
    host.items.set(Array.from({ length: 30 }, (_, indice) => indice + 1));
    fixture.detectChanges();
    await aplicar();

    host.paginacion.ir(3);
    expect(host.paginacion.pagina()).toBe(3);
    expect(host.paginacion.recortar()).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);

    host.items.set(Array.from({ length: 30 }, (_, indice) => indice + 100));
    await aplicar();
    expect(host.paginacion.pagina()).toBe(3);

    host.clave.set('busqueda');
    await aplicar();
    expect(host.paginacion.pagina()).toBe(1);

    host.items.set(Array.from({ length: 30 }, (_, indice) => indice + 1));
    await aplicar();
    host.paginacion.ir(2);
    host.paginacion.cambiarTamano(25);
    await aplicar();
    expect(host.paginacion.pagina()).toBe(1);
    expect(host.paginacion.recortar().length).toBe(25);

    host.paginacion.ir(2);
    host.items.set([1, 2, 3]);
    await aplicar();
    expect(host.paginacion.pagina()).toBe(1);
    expect(host.paginacion.recortar()).toEqual([1, 2, 3]);

    host.items.set([]);
    await aplicar();
    expect(host.paginacion.recortar()).toEqual([]);
    expect(rangoPagina(0, host.paginacion.pagina(), host.paginacion.tamano()).desde).toBe(0);
  });

  it('reinicia al reemplazar el origen cuando no hay filtros', async () => {
    const fixture = TestBed.createComponent(HostPorOrigen);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await aplicar();

    host.paginacion.ir(2);
    expect(host.paginacion.pagina()).toBe(2);
    host.items.set(Array.from({ length: 30 }, (_, indice) => indice + 50));
    await aplicar();
    expect(host.paginacion.pagina()).toBe(1);
  });

  it('corrige una página fuera de rango sin perder el resto de los registros', () => {
    expect(recortarPagina(registros(11), 9, 10)).toEqual([11]);
    expect(rangoPagina(248, 99, 25).pagina).toBe(10);
    expect(recortarPagina(registros(248), 1, 10).length).toBe(10);
    expect(registros(248).length).toBe(248);
  });
});
