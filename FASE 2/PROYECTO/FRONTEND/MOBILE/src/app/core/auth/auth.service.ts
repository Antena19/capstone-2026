import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { urlApi } from '../config/api';
import {
  LoginRespuesta,
  LoginSolicitud,
  MensajeRespuesta,
  SesionUsuario,
} from '../models/autenticacion';

const CLAVE_SESION = 'trayek.sesion.pasajero';
const ROL_PASAJERO = 'PASAJERO';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesionSignal = signal<SesionUsuario | null>(null);

  readonly sesion = this.sesionSignal.asReadonly();
  readonly autenticado = computed(() => this.sesionSignal() !== null);
  readonly token = computed(() => this.sesionSignal()?.token ?? null);

  constructor() {
    this.restaurarSesion();
  }

  iniciarSesion(solicitud: LoginSolicitud) {
    return this.http.post<LoginRespuesta>(urlApi('/api/autenticacion/login'), solicitud).pipe(
      map((respuesta) => {
        const normalizada = this.normalizarRespuesta(respuesta);
        if (!this.esPasajero(normalizada.rol) || !normalizada.token) {
          return normalizada;
        }

        this.guardarSesion({
          token: normalizada.token,
          idUsuario: normalizada.idUsuario,
          email: normalizada.email,
          telefono: normalizada.telefono,
          rol: normalizada.rol,
          expiracion: normalizada.expiracion,
        });

        return normalizada;
      }),
    );
  }

  activarCuenta(telefono: string, codigo: string, nuevaPassword: string) {
    return this.http.post(urlApi('/api/autenticacion/activar-cuenta'), {
      telefono,
      codigo,
      nuevaPassword,
    });
  }

  reenviarActivacion(telefono: string) {
    return this.http.post<MensajeRespuesta>(urlApi('/api/autenticacion/reenviar-activacion'), {
      telefono,
    });
  }

  esPasajero(rol: string | null | undefined): boolean {
    return (rol ?? '').trim() === ROL_PASAJERO;
  }

  cerrarSesion(): void {
    this.sesionSignal.set(null);
    localStorage.removeItem(CLAVE_SESION);
  }

  mensajeErrorHttp(error: unknown, respaldo = 'No fue posible completar la operación.'): string {
    if (error instanceof HttpErrorResponse) {
      const cuerpo = error.error as MensajeRespuesta | undefined;
      if (cuerpo?.mensaje) {
        return cuerpo.mensaje;
      }
    }

    return respaldo;
  }

  private normalizarRespuesta(raw: LoginRespuesta): LoginRespuesta {
    const datos = raw as unknown as Record<string, unknown>;

    return {
      token: String(datos['token'] ?? datos['Token'] ?? ''),
      idUsuario: Number(datos['idUsuario'] ?? datos['IdUsuario'] ?? 0),
      email: String(datos['email'] ?? datos['Email'] ?? ''),
      telefono: (datos['telefono'] ?? datos['Telefono'] ?? null) as string | null,
      rol: String(datos['rol'] ?? datos['Rol'] ?? '').trim(),
      expiracion: String(datos['expiracion'] ?? datos['Expiracion'] ?? ''),
      debeCambiarPassword: Boolean(
        datos['debeCambiarPassword'] ?? datos['DebeCambiarPassword'] ?? false,
      ),
    };
  }

  private guardarSesion(sesion: SesionUsuario): void {
    this.sesionSignal.set(sesion);
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  }

  private restaurarSesion(): void {
    const crudo = localStorage.getItem(CLAVE_SESION);
    if (!crudo) {
      return;
    }

    try {
      const sesion = this.normalizarRespuesta(JSON.parse(crudo) as LoginRespuesta);
      if (!sesion.token || !sesion.expiracion || !this.esPasajero(sesion.rol)) {
        this.cerrarSesion();
        return;
      }

      if (Date.parse(sesion.expiracion) <= Date.now()) {
        this.cerrarSesion();
        return;
      }

      this.sesionSignal.set(sesion);
    } catch {
      this.cerrarSesion();
    }
  }
}
