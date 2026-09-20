import { Component, inject, OnInit, signal } from '@angular/core';
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
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
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
  ],
})
export class ConductorDetallePage implements OnInit {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly avisos = inject(ToastController);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly errorInicio = signal<string | null>(null);
  readonly iniciando = signal(false);
  readonly detalle = signal<ServicioConductorDetalle | null>(null);

  readonly formatearFecha = formatearFechaChile;
  readonly formatearHora = formatearHoraPlanificada;
  readonly formatearFechaHora = formatearFechaHoraLocal;
  readonly etiquetaEstado = etiquetaEstadoServicio;
  readonly colorEstado = colorEstadoServicio;
  readonly tieneTexto = tieneTexto;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const idServicio = Number(this.ruta.snapshot.paramMap.get('idServicio'));
    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      this.cargando.set(false);
      this.detalle.set(null);
      this.error.set('El servicio indicado no es válido.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.api.obtenerDetalleConductor(idServicio).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.detalle.set(null);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar el detalle del servicio.'));
      },
    });
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
    this.api.obtenerDetalleConductor(idServicio).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.iniciando.set(false);
        this.errorInicio.set(null);
      },
      error: (err: unknown) => {
        this.iniciando.set(false);
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
}
