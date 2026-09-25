import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { ServicioConductorDetalle } from '../../../core/models/conductor';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  colorEstadoServicio,
  etiquetaEstadoServicio,
  formatearFechaChile,
  formatearFechaHoraLocal,
  formatearHoraPlanificada,
  tieneTexto,
} from '../../../core/utils/formato-servicio';

@Component({
  selector: 'app-conductor-detalle',
  templateUrl: './conductor-detalle.page.html',
  styleUrls: ['./conductor-detalle.page.scss'],
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
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class ConductorDetallePage implements ViewWillEnter {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly avisos = inject(ToastController);
  private pedidoDetalle = 0;

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly errorInicio = signal<string | null>(null);
  readonly errorFin = signal<string | null>(null);
  readonly iniciando = signal(false);
  readonly finalizando = signal(false);
  readonly detalle = signal<ServicioConductorDetalle | null>(null);

  readonly formatearFecha = formatearFechaChile;
  readonly formatearHora = formatearHoraPlanificada;
  readonly formatearFechaHora = formatearFechaHoraLocal;
  readonly etiquetaEstado = etiquetaEstadoServicio;
  readonly colorEstado = colorEstadoServicio;
  readonly tieneTexto = tieneTexto;

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(alTerminar?: () => void): void {
    const idServicio = Number(this.ruta.snapshot.paramMap.get('idServicio'));
    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      this.cargando.set(false);
      this.detalle.set(null);
      this.error.set('El servicio indicado no es válido.');
      alTerminar?.();
      return;
    }

    const pedido = ++this.pedidoDetalle;
    const silencioso = this.detalle() != null;
    if (!silencioso) {
      this.cargando.set(true);
    }

    this.error.set(null);
    this.api.obtenerDetalleConductor(idServicio).subscribe({
      next: (detalle) => {
        if (pedido !== this.pedidoDetalle) {
          alTerminar?.();
          return;
        }

        this.detalle.set(detalle);
        this.cargando.set(false);
        this.iniciando.set(false);
        this.finalizando.set(false);
        alTerminar?.();
      },
      error: (err: unknown) => {
        if (pedido !== this.pedidoDetalle) {
          alTerminar?.();
          return;
        }

        this.cargando.set(false);
        if (this.detalle() != null) {
          alTerminar?.();
          return;
        }

        this.detalle.set(null);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar el detalle del servicio.'));
        alTerminar?.();
      },
    });
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.cargar(() => evento.target.complete());
  }

  async confirmarInicio(): Promise<void> {
    if (this.iniciando() || this.detalle()?.estado !== 'PROGRAMADO') {
      return;
    }

    const alerta = await this.alertas.create({
      header: 'Iniciar servicio',
      message: '¿Confirmas que deseas iniciar este servicio?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Iniciar', role: 'confirm' },
      ],
    });
    await alerta.present();

    const { role } = await alerta.onDidDismiss();
    if (role === 'confirm') {
      this.iniciar();
    }
  }

  async confirmarFinalizacion(): Promise<void> {
    if (this.finalizando() || this.detalle()?.estado !== 'EN_CURSO') {
      return;
    }

    const alerta = await this.alertas.create({
      header: 'Finalizar servicio',
      message: '¿Confirmas que deseas finalizar este servicio?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Finalizar', role: 'confirm' },
      ],
    });
    await alerta.present();

    const { role } = await alerta.onDidDismiss();
    if (role === 'confirm') {
      this.finalizar();
    }
  }

  descripcionVehiculo(detalle: ServicioConductorDetalle): string | null {
    const partes = [detalle.vehiculo.tipo, detalle.vehiculo.marca, detalle.vehiculo.modelo]
      .map((parte) => parte.trim())
      .filter((parte) => parte.length > 0);

    return partes.length > 0 ? partes.join(' · ') : null;
  }

  abrirQr(): void {
    const idServicio = this.detalle()?.idServicio;
    if (!idServicio) {
      return;
    }

    void this.router.navigate(['/conductor/servicios', idServicio, 'qr']);
  }

  abrirPasajeros(): void {
    const idServicio = this.detalle()?.idServicio;
    if (!idServicio) {
      return;
    }

    void this.router.navigate(['/conductor/servicios', idServicio, 'pasajeros']);
  }

  private iniciar(): void {
    const servicio = this.detalle();
    if (!servicio || this.iniciando() || servicio.estado !== 'PROGRAMADO') {
      return;
    }

    this.iniciando.set(true);
    this.errorInicio.set(null);

    this.api.iniciarServicioConductor(servicio.idServicio).subscribe({
      next: () => {
        void this.avisarInicioExitoso();
        this.recargarTrasInicio(servicio.idServicio);
      },
      error: (err: unknown) => {
        this.iniciando.set(false);
        this.errorInicio.set(this.auth.mensajeErrorHttp(err, 'No fue posible iniciar el servicio.'));
      },
    });
  }

  private recargarTrasInicio(idServicio: number): void {
    const pedido = ++this.pedidoDetalle;
    this.api.obtenerDetalleConductor(idServicio).subscribe({
      next: (detalle) => {
        if (pedido !== this.pedidoDetalle) {
          return;
        }

        this.detalle.set(detalle);
        this.iniciando.set(false);
        this.errorInicio.set(null);
      },
      error: (err: unknown) => {
        if (pedido !== this.pedidoDetalle) {
          return;
        }

        this.iniciando.set(false);
        this.detalle.set(null);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar el detalle del servicio.'));
      },
    });
  }

  private finalizar(): void {
    const servicio = this.detalle();
    if (!servicio || this.finalizando() || servicio.estado !== 'EN_CURSO') {
      return;
    }

    this.finalizando.set(true);
    this.errorFin.set(null);

    this.api.finalizarServicioConductor(servicio.idServicio).subscribe({
      next: () => {
        void this.avisarFinalizacionExitosa();
        this.recargarTrasFinalizacion(servicio.idServicio);
      },
      error: (err: unknown) => {
        this.finalizando.set(false);
        this.errorFin.set(this.auth.mensajeErrorHttp(err, 'No fue posible finalizar el servicio.'));
      },
    });
  }

  private recargarTrasFinalizacion(idServicio: number): void {
    const pedido = ++this.pedidoDetalle;
    this.api.obtenerDetalleConductor(idServicio).subscribe({
      next: (detalle) => {
        if (pedido !== this.pedidoDetalle) {
          return;
        }

        this.detalle.set(detalle);
        this.finalizando.set(false);
        this.errorFin.set(null);
      },
      error: (err: unknown) => {
        if (pedido !== this.pedidoDetalle) {
          return;
        }

        this.finalizando.set(false);
        this.detalle.set(null);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar el detalle del servicio.'));
      },
    });
  }

  private async avisarInicioExitoso(): Promise<void> {
    const aviso = await this.avisos.create({
      message: 'Servicio iniciado correctamente.',
      duration: 2500,
      position: 'bottom',
    });
    await aviso.present();
  }

  private async avisarFinalizacionExitosa(): Promise<void> {
    const aviso = await this.avisos.create({
      message: 'Servicio finalizado correctamente.',
      duration: 2500,
      position: 'bottom',
    });
    await aviso.present();
  }
}
