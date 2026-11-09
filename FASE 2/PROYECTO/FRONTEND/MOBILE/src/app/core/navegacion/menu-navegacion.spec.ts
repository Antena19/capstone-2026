import { describe, expect, it } from 'vitest';
import { menuDisponible, opcionesMenu, rutaDe } from './menu-navegacion';

const sesionMovil = {
  autenticado: true,
  rolMobile: true,
  debeCambiarPassword: false,
};

describe('menú de navegación', () => {
  it('ofrece los destinos del pasajero', () => {
    expect(opcionesMenu('pasajero')).toEqual([
      { texto: 'Mis servicios', href: '/pasajero', icono: 'bus-outline' },
      { texto: 'Mi perfil', href: '/perfil', icono: 'person-outline' },
    ]);
  });

  it('ofrece los destinos del conductor', () => {
    expect(opcionesMenu('conductor')).toEqual([
      { texto: 'Mis servicios', href: '/conductor', icono: 'bus-outline' },
      { texto: 'Mi perfil', href: '/perfil', icono: 'person-outline' },
    ]);
  });

  it('permite el menú en las pantallas autenticadas del rol', () => {
    expect(menuDisponible({ ...sesionMovil, url: '/pasajero' })).toBe(true);
    expect(menuDisponible({ ...sesionMovil, url: '/conductor/servicios/4' })).toBe(true);
    expect(menuDisponible({ ...sesionMovil, url: '/perfil/cambiar-password' })).toBe(true);
  });

  it('bloquea el menú en pantallas públicas y en el cambio obligatorio', () => {
    for (const url of ['/login', '/activar', '/recuperar', '/restablecer', '/cambiar-password']) {
      expect(menuDisponible({ ...sesionMovil, url })).toBe(false);
    }

    expect(menuDisponible({ ...sesionMovil, url: '/login?return=1' })).toBe(false);
    expect(menuDisponible({ ...sesionMovil, debeCambiarPassword: true, url: '/pasajero' })).toBe(
      false,
    );
    expect(menuDisponible({ ...sesionMovil, autenticado: false, url: '/pasajero' })).toBe(false);
    expect(menuDisponible({ ...sesionMovil, rolMobile: false, url: '/pasajero' })).toBe(false);
  });

  it('normaliza la ruta antes de decidir', () => {
    expect(rutaDe('/cambiar-password/')).toBe('/cambiar-password');
    expect(rutaDe('/perfil/cambiar-password?x=1')).toBe('/perfil/cambiar-password');
  });
});
