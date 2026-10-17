import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  busOutline,
  calendarNumberOutline,
  calendarOutline,
  chevronForwardOutline,
  flagOutline,
  keyOutline,
  logOutOutline,
  person,
} from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { ROL_CONDUCTOR, ROL_PASAJERO } from '../../core/constants/auth';
import { MisServiciosService } from '../../core/services/mis-servicios.service';
import { formatearFechaChile } from '../../core/utils/formato-servicio';
import {
  asistenciaEfectiva,
  ResumenViajes,
  resumirViajes,
  servicioFinalizado,
} from '../../core/utils/resumen-viajes';

addIcons({
  person,
  busOutline,
  calendarOutline,
  flagOutline,
  calendarNumberOutline,
  keyOutline,
  logOutOutline,
  chevronForwardOutline,
});

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonNote,
  ],
})
export class PerfilPage implements ViewWillEnter {
  private readonly auth = inject(AuthService);
  private readonly api = inject(MisServiciosService);
  private readonly router = inject(Router);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenViajes | null>(null);
  readonly formatearFecha = formatearFechaChile;

  ionViewWillEnter(): void {
    this.cargar();
  }

  nombre(): string | null {
    return this.auth.nombreCompleto();
  }

  correo(): string {
    const correo = this.auth.sesion()?.email?.trim();
    return correo ? correo : 'Sin correo en la sesión';
  }

  rol(): string {
    if (this.auth.esConductor()) {
      return 'Conductor';
    }

    if (this.auth.esPasajero()) {
      return 'Pasajero';
    }

    return this.auth.sesion()?.rol ?? '';
  }

  destinoVolver(): string {
    return this.auth.rutaInicio();
  }

  explicacion(): string {
    return this.auth.esConductor()
      ? 'Los viajes realizados son servicios finalizados asignados a tu cuenta.'
      : 'Los viajes realizados son aquellos con asistencia efectiva registrada.';
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const rol = this.auth.sesion()?.rol;

    if (rol === ROL_CONDUCTOR) {
      this.api.listarConductor().subscribe({
        next: (servicios) => {
          this.resumen.set(
            resumirViajes(
              servicios.map((servicio) => ({
                fecha: servicio.fecha,
                realizado: servicioFinalizado(servicio.estado),
              })),
            ),
          );
          this.cargando.set(false);
        },
        error: (error: unknown) => this.fallo(error),
      });
      return;
    }

    if (rol === ROL_PASAJERO) {
      this.api.listarPasajero().subscribe({
        next: (servicios) => {
          this.resumen.set(
            resumirViajes(
              servicios.map((servicio) => ({
                fecha: servicio.fecha,
                realizado: asistenciaEfectiva(servicio.estadoAsistencia),
              })),
            ),
          );
          this.cargando.set(false);
        },
        error: (error: unknown) => this.fallo(error),
      });
      return;
    }

    this.cargando.set(false);
    this.error.set('No fue posible identificar el perfil.');
  }

  cambiarPassword(): void {
    void this.router.navigate(['/perfil/cambiar-password']);
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  private fallo(error: unknown): void {
    this.resumen.set(null);
    this.cargando.set(false);
    this.error.set(this.auth.mensajeErrorHttp(error, 'No fue posible cargar tu perfil.'));
  }
}
