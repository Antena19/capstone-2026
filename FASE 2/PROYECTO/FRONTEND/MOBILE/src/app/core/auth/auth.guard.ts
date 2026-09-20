import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

function redirigirSiNoHaySesionMobile(): UrlTree | null {
  const auth = inject(AuthService);
  if (auth.autenticado() && auth.esRolMobile(auth.sesion()?.rol)) {
    return null;
  }

  return inject(Router).parseUrl('/login');
}

function redirigirSiDebeCambiarPassword(): UrlTree | null {
  const auth = inject(AuthService);
  if (auth.debeCambiarPassword()) {
    return inject(Router).parseUrl('/cambiar-password');
  }

  return null;
}

export const authGuard: CanActivateFn = () => {
  return redirigirSiNoHaySesionMobile() ?? true;
};

export function rolGuard(rolRequerido: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const sinSesion = redirigirSiNoHaySesionMobile();
    if (sinSesion) {
      return sinSesion;
    }

    const cambioObligatorio = redirigirSiDebeCambiarPassword();
    if (cambioObligatorio) {
      return cambioObligatorio;
    }

    if ((auth.sesion()?.rol ?? '').trim() === rolRequerido) {
      return true;
    }

    return inject(Router).parseUrl(auth.rutaInicio());
  };
}

export const cambiarPasswordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const sinSesion = redirigirSiNoHaySesionMobile();
  if (sinSesion) {
    return sinSesion;
  }

  if (auth.debeCambiarPassword()) {
    return true;
  }

  return inject(Router).parseUrl(auth.rutaInicio());
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.autenticado() && auth.esRolMobile(auth.sesion()?.rol)) {
    return inject(Router).parseUrl(auth.rutaInicio());
  }

  return true;
};
