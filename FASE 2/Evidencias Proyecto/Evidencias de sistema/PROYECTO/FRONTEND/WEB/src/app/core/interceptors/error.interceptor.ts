import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { esCambioPasswordObligatorio } from '../utils/http-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const esLogin = req.url.includes('/api/autenticacion/login');
      const esCambioPassword = req.url.includes('/api/autenticacion/cambiar-password');

      if (error.status === 401 && !esLogin) {
        auth.cerrarSesion();
        void router.navigateByUrl('/login');
        return throwError(() => error);
      }

      if (
        !esLogin &&
        !esCambioPassword &&
        auth.autenticado() &&
        esCambioPasswordObligatorio(error)
      ) {
        auth.marcarDebeCambiarPassword();
        if (!router.url.startsWith('/cambiar-password')) {
          void router.navigateByUrl('/cambiar-password');
        }
      }

      return throwError(() => error);
    }),
  );
};
