import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.esAdministrador()) {
    return true;
  }

  if (auth.autenticado()) {
    auth.cerrarSesion();
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.esAdministrador()) {
    return router.createUrlTree([auth.rutaInicio()]);
  }

  return true;
};

export const passwordObligatorioGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.debeCambiarPassword()) {
    return router.createUrlTree(['/cambiar-password']);
  }

  return true;
};

export const cambiarPasswordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.debeCambiarPassword()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
