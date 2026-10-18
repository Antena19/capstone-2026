import { Component, OnDestroy, inject, signal } from '@angular/core';
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
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { EstadoConfirmacionViaje } from '../../../core/models/conductor';
import { ServicioPasajeroDetalle } from '../../../core/models/pasajero';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  ContextoRefresco,
  crearRefrescoOperativo,
  decidirErrorRefresco,
} from '../../../core/utils/refresco-operativo';
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
  textoCancelacion,
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
export class PasajeroDetallePage implements ViewWillEnter, ViewWillLeave, OnDestroy {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly refresco = crearRefrescoOperativo((contexto) => this.ejecutarCarga(contexto));
  private cierreManual: (() => void) | undefined;
  private sincronizandoConfirmacion = false;

  readonly cargando = signal(true);
  readonly confirmando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorConfirmacion = signal<string | null>(null);
  readonly detalle = signal<ServicioPasajeroDetalle | null>(null);

  readonly formatearFecha = formatearFechaChile;
  readonly formatearHora = formatearHoraPlanificada;
  readonly formatearFechaHora = formatearFechaHoraLocal;
  readonly textoCancelacion = textoCancelacion;
  readonly etiquetaEstado = etiquetaEstadoServicio;
  readonly colorEstado = colorEstadoServicio;
  readonly etiquetaConfirmacion = etiquetaConfirmacion;
  readonly colorConfirmacion = colorConfirmacion;
  readonly etiquetaAsistencia = etiquetaEstadoAsistencia;
  readonly etiquetaTipoAsistencia = etiquetaTipoAsistencia;
  readonly etiquetaMetodoAsistencia = etiquetaMetodoAsistencia;
  readonly tieneTexto = tieneTexto;

  ionViewWillEnter(): void {
    this.refresco.entrar();
  }

  ionViewWillLeave(): void {
    this.refresco.salir();
  }

  ngOnDestroy(): void {
    this.refresco.salir();
  }

  cargar(): void {
    this.refresco.solicitar();
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.cierreManual = () => evento.target.complete();
    this.refresco.solicitar(true);
  }

  private ejecutarCarga(contexto: ContextoRefresco): void {
    const { generacion, avisarError, automatico } = contexto;
    const idServicio = Number(this.ruta.snapshot.paramMap.get('idServicio'));
    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      this.cargando.set(false);
      this.detalle.set(null);
      this.error.set('El servicio indicado no es válido.');
      this.cerrarRefresco(generacion, avisarError);
      return;
    }

    if (this.detalle() == null && !automatico && !avisarError) {
      this.cargando.set(true);
    }

    this.api.obtenerDetallePasajero(idServicio).subscribe({
      next: (detalle) => {
        if (!this.refresco.esVigente(generacion)) {
          this.cerrarRefresco(generacion, avisarError);
          return;
        }

        this.detalle.set(detalle);
        this.cargando.set(false);
        this.error.set(null);
        if (this.sincronizandoConfirmacion) {
          this.sincronizandoConfirmacion = false;
          this.confirmando.set(false);
        }
        this.cerrarRefresco(generacion, avisarError);
      },
      error: (err: unknown) => {
        if (!this.refresco.esVigente(generacion)) {
          this.cerrarRefresco(generacion, avisarError);
          return;
        }

        this.cargando.set(false);
        if (this.sincronizandoConfirmacion) {
          this.sincronizandoConfirmacion = false;
          this.confirmando.set(false);
        }
        const decision = decidirErrorRefresco(this.detalle() != null, avisarError);
        if (decision.mostrarError) {
          this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar el detalle del servicio.'));
        }

        this.cerrarRefresco(generacion, avisarError);
      },
    });
  }

  verRecorrido(): void {
    const idServicio = this.detalle()?.idServicio;
    if (!idServicio) {
      return;
    }

    void this.router.navigate(['/pasajero/servicios', idServicio, 'recorrido']);
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

  private cerrarRefresco(generacion: number, avisarError: boolean): void {
    const vigente = this.refresco.esVigente(generacion);
    this.refresco.completar(generacion);
    if (vigente && avisarError) {
      const cerrar = this.cierreManual;
      this.cierreManual = undefined;
      cerrar?.();
    }
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
          this.sincronizandoConfirmacion = true;
          this.errorConfirmacion.set(null);
          this.refresco.solicitar();
        },
        error: (err: unknown) => {
          this.confirmando.set(false);
          this.sincronizandoConfirmacion = false;
          this.errorConfirmacion.set(
            this.auth.mensajeErrorHttp(err, 'No fue posible actualizar la confirmación.'),
          );
        },
      });
  }
}
