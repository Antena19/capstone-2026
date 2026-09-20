import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { toDataURL } from 'qrcode';
import { AuthService } from '../../../core/auth/auth.service';
import { ServicioConductorDetalle } from '../../../core/models/conductor';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  formatearFechaChile,
  formatearHoraChile,
  formatearHoraPlanificada,
} from '../../../core/utils/formato-servicio';

@Component({
  selector: 'app-conductor-qr',
  templateUrl: './conductor-qr.page.html',
  styleUrls: ['./conductor-qr.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonSpinner,
    IonNote,
  ],
})
export class ConductorQrPage implements ViewWillEnter, ViewWillLeave {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly imagenQr = signal<string | null>(null);
  readonly horaExpiracion = signal<string | null>(null);
  readonly resumenServicio = signal<string | null>(null);

  readonly idServicio = Number(this.ruta.snapshot.paramMap.get('idServicio'));
  private secuencia = 0;

  ionViewWillEnter(): void {
    this.cargar();
  }

  ionViewWillLeave(): void {
    this.secuencia += 1;
    this.limpiar();
  }

  cargar(): void {
    const secuencia = ++this.secuencia;
    if (!Number.isInteger(this.idServicio) || this.idServicio <= 0) {
      this.limpiar();
      this.cargando.set(false);
      this.error.set('El servicio indicado no es válido.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.imagenQr.set(null);
    this.horaExpiracion.set(null);
    this.cargarResumenServicio(secuencia, this.idServicio);

    this.api.obtenerQrConductor(this.idServicio).subscribe({
      next: (qr) => {
        if (secuencia !== this.secuencia) {
          return;
        }

        void this.renderizar(secuencia, qr.token, qr.fechaExpiracion);
      },
      error: (err: unknown) => {
        if (secuencia !== this.secuencia) {
          return;
        }

        this.limpiar();
        this.cargando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible obtener el código QR.'));
      },
    });
  }

  private cargarResumenServicio(secuencia: number, idServicio: number): void {
    this.api.obtenerDetalleConductor(idServicio).subscribe({
      next: (detalle) => {
        if (secuencia !== this.secuencia) {
          return;
        }

        this.resumenServicio.set(this.armarResumen(detalle));
      },
      error: () => {
        if (secuencia !== this.secuencia) {
          return;
        }

        this.resumenServicio.set(null);
      },
    });
  }

  private armarResumen(detalle: ServicioConductorDetalle): string {
    return `${formatearFechaChile(detalle.fecha)} · ${formatearHoraPlanificada(detalle.horaInicio)} – ${formatearHoraPlanificada(detalle.horaFin)}`;
  }

  private async renderizar(secuencia: number, token: string, fechaExpiracion: string): Promise<void> {
    const valor = token.trim();
    if (!valor) {
      if (secuencia !== this.secuencia) {
        return;
      }

      this.limpiar();
      this.cargando.set(false);
      this.error.set('No fue posible obtener el código QR.');
      return;
    }

    try {
      const imagen = await toDataURL(valor, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      if (secuencia !== this.secuencia) {
        return;
      }

      this.imagenQr.set(imagen);
      this.horaExpiracion.set(formatearHoraChile(fechaExpiracion));
      this.cargando.set(false);
    } catch {
      if (secuencia !== this.secuencia) {
        return;
      }

      this.limpiar();
      this.cargando.set(false);
      this.error.set('No fue posible obtener el código QR.');
    }
  }

  private limpiar(): void {
    this.imagenQr.set(null);
    this.horaExpiracion.set(null);
    this.resumenServicio.set(null);
  }
}
