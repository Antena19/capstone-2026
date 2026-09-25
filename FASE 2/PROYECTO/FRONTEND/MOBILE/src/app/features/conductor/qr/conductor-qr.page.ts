import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { toDataURL } from 'qrcode';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { EstadoServicio, QrServicioRespuesta, ServicioConductorDetalle } from '../../../core/models/conductor';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  etiquetaEstadoServicio,
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
    IonRefresher,
    IonRefresherContent,
  ],
})
export class ConductorQrPage implements ViewWillEnter, ViewWillLeave {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly alertas = inject(AlertController);

  readonly cargando = signal(true);
  readonly generando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorGeneracion = signal<string | null>(null);
  readonly imagenQr = signal<string | null>(null);
  readonly horaExpiracion = signal<string | null>(null);
  readonly resumenServicio = signal<string | null>(null);
  readonly estadoServicio = signal<EstadoServicio | null>(null);

  readonly idServicio = Number(this.ruta.snapshot.paramMap.get('idServicio'));
  private secuencia = 0;

  ionViewWillEnter(): void {
    this.cargar();
  }

  ionViewWillLeave(): void {
    this.secuencia += 1;
    this.limpiarVista();
  }

  puedeGestionarQr(): boolean {
    return this.estadoServicio() === 'EN_CURSO';
  }

  etiquetaEstado(): string {
    const estado = this.estadoServicio();
    return estado ? etiquetaEstadoServicio(estado) : '';
  }

  cargar(alTerminar?: () => void): void {
    const secuencia = ++this.secuencia;
    if (!Number.isInteger(this.idServicio) || this.idServicio <= 0) {
      this.limpiarVista();
      this.cargando.set(false);
      this.error.set('El servicio indicado no es válido.');
      alTerminar?.();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.errorGeneracion.set(null);
    this.imagenQr.set(null);
    this.horaExpiracion.set(null);
    this.consultar(secuencia, alTerminar);
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.cargar(() => evento.target.complete());
  }

  async pedirGeneracion(renovar: boolean): Promise<void> {
    if (this.generando() || !this.puedeGestionarQr()) {
      return;
    }

    const alerta = await this.alertas.create({
      header: renovar ? 'Renovar QR' : 'Generar nuevo QR',
      message: renovar
        ? 'Se invalidará el código actual y se creará uno nuevo. ¿Deseas continuar?'
        : 'Se generará un código QR para que los pasajeros registren asistencia. ¿Deseas continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: renovar ? 'Renovar' : 'Generar', role: 'confirm' },
      ],
    });
    await alerta.present();

    const { role } = await alerta.onDidDismiss();
    if (role === 'confirm') {
      this.generar();
    }
  }

  private consultar(secuencia: number, alTerminar?: () => void): void {
    forkJoin({
      detalle: this.api.obtenerDetalleConductor(this.idServicio).pipe(catchError(() => of(null))),
      qr: this.api.obtenerQrConductor(this.idServicio).pipe(
        catchError((error: HttpErrorResponse) => {
          if (esQrInactivo(error)) {
            return of(null);
          }

          return throwError(() => error);
        }),
      ),
    }).subscribe({
      next: ({ detalle, qr }) => {
        if (secuencia !== this.secuencia) {
          alTerminar?.();
          return;
        }

        this.aplicarDetalle(detalle);
        if (qr) {
          void this.renderizar(secuencia, qr, alTerminar);
          return;
        }

        this.imagenQr.set(null);
        this.horaExpiracion.set(null);
        this.cargando.set(false);
        this.generando.set(false);
        alTerminar?.();
      },
      error: (err: unknown) => {
        if (secuencia !== this.secuencia) {
          alTerminar?.();
          return;
        }

        this.imagenQr.set(null);
        this.horaExpiracion.set(null);
        this.cargando.set(false);
        this.generando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible obtener el código QR.'));
        alTerminar?.();
      },
    });
  }

  private generar(): void {
    if (this.generando() || !this.puedeGestionarQr()) {
      return;
    }

    const secuencia = this.secuencia;
    this.generando.set(true);
    this.errorGeneracion.set(null);

    this.api.generarQrConductor(this.idServicio).subscribe({
      next: () => {
        if (secuencia !== this.secuencia) {
          return;
        }

        this.consultar(secuencia);
      },
      error: (err: unknown) => {
        if (secuencia !== this.secuencia) {
          return;
        }

        this.generando.set(false);
        this.errorGeneracion.set(this.auth.mensajeErrorHttp(err, 'No fue posible generar el código QR.'));
      },
    });
  }

  private aplicarDetalle(detalle: ServicioConductorDetalle | null): void {
    if (!detalle) {
      return;
    }

    this.estadoServicio.set(detalle.estado);
    this.resumenServicio.set(this.armarResumen(detalle));
  }

  private armarResumen(detalle: ServicioConductorDetalle): string {
    return `${formatearFechaChile(detalle.fecha)} · ${formatearHoraPlanificada(detalle.horaInicio)} – ${formatearHoraPlanificada(detalle.horaFin)}`;
  }

  private async renderizar(
    secuencia: number,
    qr: QrServicioRespuesta,
    alTerminar?: () => void,
  ): Promise<void> {
    const valor = qr.token.trim();
    if (!valor) {
      if (secuencia !== this.secuencia) {
        alTerminar?.();
        return;
      }

      this.imagenQr.set(null);
      this.horaExpiracion.set(null);
      this.cargando.set(false);
      this.generando.set(false);
      this.error.set('No fue posible obtener el código QR.');
      alTerminar?.();
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
        alTerminar?.();
        return;
      }

      this.imagenQr.set(imagen);
      this.horaExpiracion.set(formatearHoraChile(qr.fechaExpiracion));
      this.cargando.set(false);
      this.generando.set(false);
      this.error.set(null);
      alTerminar?.();
    } catch {
      if (secuencia !== this.secuencia) {
        alTerminar?.();
        return;
      }

      this.imagenQr.set(null);
      this.horaExpiracion.set(null);
      this.cargando.set(false);
      this.generando.set(false);
      this.error.set('No fue posible obtener el código QR.');
      alTerminar?.();
    }
  }

  private limpiarVista(): void {
    this.imagenQr.set(null);
    this.horaExpiracion.set(null);
    this.resumenServicio.set(null);
    this.estadoServicio.set(null);
    this.error.set(null);
    this.errorGeneracion.set(null);
    this.generando.set(false);
  }
}

function esQrInactivo(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  const cuerpo = error.error as { mensaje?: string } | string | undefined;
  const mensaje = (typeof cuerpo === 'string' ? cuerpo : (cuerpo?.mensaje ?? '')).toLowerCase();
  if (error.status === 404 || mensaje.includes('no hay un qr activo') || mensaje.includes('ha expirado')) {
    return true;
  }

  return mensaje.includes('cancelado o finalizado');
}
