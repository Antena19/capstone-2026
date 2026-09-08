import { HttpErrorResponse } from '@angular/common/http';
import { MensajeRespuesta } from '../models/autenticacion';

export function mensajeErrorHttp(
  error: unknown,
  fallback = 'Ocurrió un error. Intente nuevamente.',
): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as MensajeRespuesta | undefined;
    if (cuerpo?.mensaje) {
      return cuerpo.mensaje;
    }

    if (error.status === 400) {
      return 'Los datos enviados no son válidos.';
    }

    if (error.status === 403) {
      return 'No tiene permiso para realizar esta acción.';
    }

    if (error.status === 404) {
      return 'No se encontró el recurso solicitado.';
    }

    if (error.status === 409) {
      return 'La operación entra en conflicto con un registro existente.';
    }

    if (error.status >= 500) {
      return 'Ha ocurrido un error interno.';
    }
  }

  return fallback;
}
