import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { urlApi } from '../config/api';
import {
  CLAVE_SESION_LOCAL,
  CLAVE_SESION_TEMPORAL,
  ROL_ADMINISTRADOR,
} from '../constants/auth';
import {
  LoginRespuesta,
  LoginSolicitud,
  MensajeRespuesta,
  SesionUsuario,
} from '../models/autenticacion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesionSignal = signal<SesionUsuario | null>(null);

  readonly sesion = this.sesionSignal.asReadonly();
  readonly autenticado = computed(() => this.sesionSignal() !== null);
  readonly esAdministrador = computed(() => this.esRolAdministrador(this.sesionSignal()?.rol));
  readonly token = computed(() => this.sesionSignal()?.token ?? null);

  constructor() {
    this.restaurarSesion();
  }

  iniciarSesion(solicitud: LoginSolicitud, recordar: boolean) {
    return this.http.post<LoginRespuesta>(urlApi('/api/autenticacion/login'), solicitud).pipe(
      map((respuesta) => {
        const normalizada = this.normalizarRespuesta(respuesta);
        if (!this.esRolAdministrador(normalizada.rol) || !normalizada.token) {
          return normalizada;
        }

        this.guardarSesion(
          {
            token: normalizada.token,
            idUsuario: normalizada.idUsuario,
            email: normalizada.email,
            rol: normalizada.rol,
            expiracion: normalizada.expiracion,
          },
          recordar,
        );

        return normalizada;
      }),
    );
  }

  esRolAdministrador(rol: string | null | undefined): boolean {
    return (rol ?? '').trim() === ROL_ADMINISTRADOR;
  }

  cerrarSesion(): void {
    this.sesionSignal.set(null);
    localStorage.removeItem(CLAVE_SESION_LOCAL);
    sessionStorage.removeItem(CLAVE_SESION_TEMPORAL);
  }

  mensajeErrorHttp(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const cuerpo = error.error as MensajeRespuesta | undefined;
      if (cuerpo?.mensaje) {
        return cuerpo.mensaje;
      }
    }

    return 'No fue posible iniciar sesión. Intente nuevamente.';
  }

  private normalizarRespuesta(raw: LoginRespuesta): LoginRespuesta {
    const datos = raw as unknown as Record<string, unknown>;

    return {
      token: String(datos['token'] ?? datos['Token'] ?? ''),
      idUsuario: Number(datos['idUsuario'] ?? datos['IdUsuario'] ?? 0),
      email: String(datos['email'] ?? datos['Email'] ?? ''),
      rol: String(datos['rol'] ?? datos['Rol'] ?? '').trim(),
      expiracion: String(datos['expiracion'] ?? datos['Expiracion'] ?? ''),
    };
  }

  private guardarSesion(sesion: SesionUsuario, recordar: boolean): void {
    this.sesionSignal.set(sesion);
    const payload = JSON.stringify(sesion);
    localStorage.removeItem(CLAVE_SESION_LOCAL);
    sessionStorage.removeItem(CLAVE_SESION_TEMPORAL);

    if (recordar) {
      localStorage.setItem(CLAVE_SESION_LOCAL, payload);
      return;
    }

    sessionStorage.setItem(CLAVE_SESION_TEMPORAL, payload);
  }

  private restaurarSesion(): void {
    const crudo =
      localStorage.getItem(CLAVE_SESION_LOCAL) ?? sessionStorage.getItem(CLAVE_SESION_TEMPORAL);

    if (!crudo) {
      return;
    }

    try {
      const sesion = this.normalizarRespuesta(JSON.parse(crudo) as LoginRespuesta);
      if (!sesion.token || !sesion.expiracion || !this.esRolAdministrador(sesion.rol)) {
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
