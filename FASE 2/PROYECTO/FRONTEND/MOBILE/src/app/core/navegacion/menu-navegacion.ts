export interface OpcionMenu {
  texto: string;
  href: string;
  icono: string;
}

const RUTAS_SIN_MENU = new Set([
  '/login',
  '/activar',
  '/recuperar',
  '/restablecer',
  '/cambiar-password',
]);

export function rutaDe(url: string): string {
  const sinParametros = url.split('?')[0]?.split('#')[0] ?? '';
  if (sinParametros.length > 1 && sinParametros.endsWith('/')) {
    return sinParametros.slice(0, -1);
  }

  return sinParametros || '/';
}

export function menuDisponible(datos: {
  autenticado: boolean;
  rolMobile: boolean;
  debeCambiarPassword: boolean;
  url: string;
}): boolean {
  if (!datos.autenticado || !datos.rolMobile || datos.debeCambiarPassword) {
    return false;
  }

  return !RUTAS_SIN_MENU.has(rutaDe(datos.url));
}

export function opcionesMenu(rol: 'pasajero' | 'conductor'): OpcionMenu[] {
  return [
    {
      texto: 'Mis servicios',
      href: rol === 'conductor' ? '/conductor' : '/pasajero',
      icono: 'bus-outline',
    },
    {
      texto: 'Mi perfil',
      href: '/perfil',
      icono: 'person-outline',
    },
  ];
}
