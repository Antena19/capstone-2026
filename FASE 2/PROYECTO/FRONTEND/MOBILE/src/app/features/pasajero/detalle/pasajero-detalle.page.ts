import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  ViewWillEnter,
} from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { EstadoConfirmacionViaje } from '../../../core/models/conductor';
import { ServicioPasajeroDetalle } from '../../../core/models/pasajero';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  colorConfirmacion,
  colorEstadoServicio,
  etiquetaConfirmacion,
  etiquetaEstadoAsistencia,
  etiquetaEstadoServicio,
  etiquetaMetodoAsistencia,
  etiquetaTipoAsistencia,
  formatearFechaChile,
  formatearFechaHoraLocal,
  formatearHoraPlanificada,
  tieneTexto,
} from '../../../core/utils/formato-servicio';

@Component({
  selector: 'app-pasajero-detalle',
  templateUrl: './pasajero-detalle.page.html',
  styleUrls: ['./pasajero-detalle.page.scss'],
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
export class PasajeroDetallePage implements ViewWillEnter {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly alertas = inject(AlertController);
  private pedidoDetalle = 0;

  readonly cargando = signal(true);
  readonly confirmando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorConfirmacion = signal<string | null>(null);
  readonly detalle = signal<ServicioPasajeroDetalle | null>(null);

  readonly formatearFecha = formatearFechaChile;
  readonly formatearHora = formatearHoraPlanificada;
  readonly formatearFechaHora = formatearFechaHoraLocal;
  readonly etiquetaEstado = etiquetaEstadoServicio;
  readonly colorEstado = colorEstadoServicio;
  readonly etiquetaConfirmacion = etiquetaConfirmacion;
  readonly colorConfirmacion = colorConfirmacion;
  readonly etiquetaAsistencia = etiquetaEstadoAsistencia;
  readonly etiquetaTipoAsistencia = etiquetaTipoAsistencia;
  readonly etiquetaMetodoAsistencia = etiquetaMetodoAsistencia;
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
    this.api.obtenerDetallePasajero(idServicio).subscribe({
      next: (detalle) => {
        if (pedido !== this.pedidoDetalle) {
          alTerminar?.();
          return;
        }

        this.detalle.set(detalle);
        this.cargando.set(false);
        this.confirmando.set(false);
        alTerminar?.();
      },
      error: (err: unknown) => {
        if (pedido !== this.pedidoDetalle) {
          alTerminar?.();
          return;
        }

        this.cargando.set(false);
        this.confirmando.set(false);
        if (this.detalle() == null) {
          this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar el detalle del servicio.'));
        }

        alTerminar?.();
      },
    });
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.cargar(() => evento.target.complete());
  }

  puedeConfirmar(estado: EstadoConfirmacionViaje): boolean {
    const detalle = this.detalle();
    return this.servicioConfirmable(detalle) && detalle?.estadoConfirmacion !== estado;
  }

  async pedirConfirmacion(estado: EstadoConfirmacionViaje): Promise<void> {
    if (!this.puedeConfirmar(estado) || this.confirmando()) {
      return;
    }

    const confirmar = estado === 'CONFIRMADO';
    const alerta = await this.alertas.create({
      header: confirmar ? 'Confirmar viaje' : 'Rechazar viaje',
      message: confirmar
        ? '¿Confirmas que asistirás a este servicio?'
        : '¿Confirmas que no asistirás a este servicio?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: confirmar ? 'Confirmar' : 'Rechazar', role: 'confirm' },
      ],
    });
    await alerta.present();

    const { role } = await alerta.onDidDismiss();
    if (role === 'confirm') {
      this.enviarConfirmacion(estado);
    }
  }

  descripcionVehiculo(detalle: ServicioPasajeroDetalle): string | null {
    const vehiculo = detalle.vehiculo;
    if (!vehiculo) {
      return null;
    }

    const partes = [vehiculo.tipo, vehiculo.marca, vehiculo.modelo]
      .map((parte) => parte.trim())
      .filter((parte) => parte.length > 0);

    return partes.length > 0 ? partes.join(' · ') : null;
  }

  private servicioConfirmable(detalle: ServicioPasajeroDetalle | null): boolean {
    return detalle?.estado === 'PROGRAMADO' || detalle?.estado === 'EN_CURSO';
  }

  private enviarConfirmacion(estado: EstadoConfirmacionViaje): void {
    const detalle = this.detalle();
    if (!detalle || this.confirmando() || !this.puedeConfirmar(estado)) {
      return;
    }

    this.confirmando.set(true);
    this.errorConfirmacion.set(null);
    this.api
      .confirmarViaje(detalle.idPasajeroServicio, {
        estadoConfirmacion: estado === 'RECHAZADO' ? 'RECHAZADO' : 'CONFIRMADO',
      })
      .subscribe({
        next: () => {
          this.cargar();
        },
        error: (err: unknown) => {
          this.confirmando.set(false);
          this.errorConfirmacion.set(
            this.auth.mensajeErrorHttp(err, 'No fue posible actualizar la confirmación.'),
          );
        },
      });
  }
}
