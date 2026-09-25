import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs';
import {
  CLAVE_SESION,
  CLAVE_SESION_LEGADA,
  ROL_CONDUCTOR,
  ROL_PASAJERO,
} from '../constants/auth';
import { urlApi } from '../config/api';
import {
  CambiarPasswordSolicitud,
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
  readonly token = computed(() => this.sesionSignal()?.token ?? null);
  readonly debeCambiarPassword = computed(
    () => this.sesionSignal()?.debeCambiarPassword === true,
  );

  constructor() {
    this.restaurarSesion();
  }

  iniciarSesion(solicitud: LoginSolicitud) {
    return this.http.post<LoginRespuesta>(urlApi('/api/autenticacion/login'), solicitud).pipe(
      map((respuesta) => {
        const normalizada = this.normalizarRespuesta(respuesta);
        if (!this.esRolMobile(normalizada.rol) || !normalizada.token) {
          return normalizada;
        }

        this.guardarSesion(this.aSesion(normalizada));

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

  cambiarPassword(solicitud: CambiarPasswordSolicitud) {
    return this.http
      .post<MensajeRespuesta>(urlApi('/api/autenticacion/cambiar-password'), solicitud)
      .pipe(
        map((respuesta) => {
          this.marcarPasswordActualizada();
          return respuesta;
        }),
      );
  }

  esPasajero(rol: string | null | undefined = this.sesionSignal()?.rol): boolean {
    return (rol ?? '').trim() === ROL_PASAJERO;
  }

  esConductor(rol: string | null | undefined = this.sesionSignal()?.rol): boolean {
    return (rol ?? '').trim() === ROL_CONDUCTOR;
  }

  esRolMobile(rol: string | null | undefined): boolean {
    const valor = (rol ?? '').trim();
    return valor === ROL_PASAJERO || valor === ROL_CONDUCTOR;
  }

  rutaInicio(rol: string | null | undefined = this.sesionSignal()?.rol): string {
    if (this.debeCambiarPassword()) {
      return '/cambiar-password';
    }

    if (this.esConductor(rol)) {
      return '/conductor';
    }

    if (this.esPasajero(rol)) {
      return '/pasajero';
    }

    return '/login';
  }

  cerrarSesion(): void {
    this.sesionSignal.set(null);
    localStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_SESION_LEGADA);
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

  private marcarPasswordActualizada(): void {
    const actual = this.sesionSignal();
    if (!actual) {
      return;
    }

    this.guardarSesion({ ...actual, debeCambiarPassword: false });
  }

  marcarDebeCambiarPassword(): void {
    const actual = this.sesionSignal();
    if (!actual || actual.debeCambiarPassword) {
      return;
    }

    this.guardarSesion({ ...actual, debeCambiarPassword: true });
  }

  private aSesion(respuesta: LoginRespuesta): SesionUsuario {
    return {
      token: respuesta.token,
      idUsuario: respuesta.idUsuario,
      email: respuesta.email,
      telefono: respuesta.telefono,
      rol: respuesta.rol,
      expiracion: respuesta.expiracion,
      debeCambiarPassword: respuesta.debeCambiarPassword,
    };
  }

  private guardarSesion(sesion: SesionUsuario): void {
    this.sesionSignal.set(sesion);
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    localStorage.removeItem(CLAVE_SESION_LEGADA);
  }

  private restaurarSesion(): void {
    const crudo = localStorage.getItem(CLAVE_SESION) ?? localStorage.getItem(CLAVE_SESION_LEGADA);
    if (!crudo) {
      return;
    }

    try {
      const sesion = this.normalizarRespuesta(JSON.parse(crudo) as LoginRespuesta);
      if (!sesion.token || !sesion.expiracion || !this.esRolMobile(sesion.rol)) {
        this.cerrarSesion();
        return;
      }

      if (Date.parse(sesion.expiracion) <= Date.now()) {
        this.cerrarSesion();
        return;
      }

      this.guardarSesion(this.aSesion(sesion));
    } catch {
      this.cerrarSesion();
    }
  }
}
