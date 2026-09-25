import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MensajeRespuesta } from '../models/autenticacion';

const RUTAS_ANONIMAS = [
  '/api/autenticacion/login',
  '/api/autenticacion/activar-cuenta',
  '/api/autenticacion/reenviar-activacion',
];

let navegandoALogin = false;

function esCambioPasswordObligatorio(error: HttpErrorResponse): boolean {
  if (error.status !== 403) {
    return false;
  }

  const cuerpo = error.error as MensajeRespuesta | string | undefined;
  const mensaje = typeof cuerpo === 'string' ? cuerpo : (cuerpo?.mensaje ?? '');
  return mensaje.toLowerCase().includes('cambiar su contraseña');
}

function redirigirALogin(auth: AuthService, router: Router): void {
  if (navegandoALogin) {
    return;
  }

  navegandoALogin = true;
  auth.cerrarSesion();

  const destino = router.url.startsWith('/login')
    ? Promise.resolve(true)
    : router.navigateByUrl('/login');

  void destino.finally(() => {
    navegandoALogin = false;
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const esAnonima = RUTAS_ANONIMAS.some((ruta) => req.url.includes(ruta));
  const esCambioPassword = req.url.includes('/api/autenticacion/cambiar-password');
  const token = auth.token();
  const peticion =
    !esAnonima && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !esAnonima) {
        redirigirALogin(auth, router);
        return throwError(() => error);
      }

      if (!esAnonima && !esCambioPassword && auth.autenticado() && esCambioPasswordObligatorio(error)) {
        auth.marcarDebeCambiarPassword();
        if (!router.url.startsWith('/cambiar-password')) {
          void router.navigateByUrl('/cambiar-password');
        }
      }

      return throwError(() => error);
    }),
  );
};
