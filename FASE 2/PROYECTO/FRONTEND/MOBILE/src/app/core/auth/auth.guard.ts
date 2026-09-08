import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.autenticado() && auth.esPasajero(auth.sesion()?.rol)) {
    return true;
  }

  return router.parseUrl('/login');
};
