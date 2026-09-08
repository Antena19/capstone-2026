import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const RUTAS_ANONIMAS = [
  '/api/autenticacion/login',
  '/api/autenticacion/activar-cuenta',
  '/api/autenticacion/reenviar-activacion',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (RUTAS_ANONIMAS.some((ruta) => req.url.includes(ruta))) {
    return next(req);
  }

  const token = inject(AuthService).token();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
