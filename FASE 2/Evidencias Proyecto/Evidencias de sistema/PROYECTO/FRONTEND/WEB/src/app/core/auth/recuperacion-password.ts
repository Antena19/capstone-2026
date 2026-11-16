import { Injectable } from '@angular/core';

export const AVISO_RECUPERACION =
  'La recuperación de contraseña estará disponible próximamente.';

/**
 * Datos que podrá enviar la pantalla de solicitud.
 * El correo describe esta interfaz y no fija el canal definitivo:
 * hay cuentas, sobre todo de pasajeros, sin correo registrado.
 */
export interface SolicitudRecuperacionAcceso {
  correo: string;
}

/** Datos que podrá enviar la pantalla de nueva contraseña. */
export interface SolicitudRestablecimientoPassword {
  passwordNueva: string;
}

/**
 * Límite con la API de recuperación.
 * Permanece inactivo hasta que exista un endpoint real: no envía correos,
 * no genera tokens y no cambia contraseñas.
 */
@Injectable({ providedIn: 'root' })
export class RecuperacionPassword {
  readonly disponible = false;
}
