import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
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
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AsistenciaRespuesta } from '../../../core/models/asistencia';
import { EstadoServicio, PasajeroServicioConductor } from '../../../core/models/conductor';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  MENSAJE_CONFIRMACION_ASISTENCIA_MANUAL,
  aplicarAsistenciaManual,
  ejecutarRegistroManual,
  puedeRegistrarAsistenciaManual,
  presentacionAsistenciaTarjeta,
  resultadoErrorAsistenciaManual,
} from '../../../core/utils/asistencia-manual-conductor';
import {
  ContextoRefresco,
  crearRefrescoOperativo,
  decidirErrorRefresco,
} from '../../../core/utils/refresco-operativo';
import {
  etiquetaConfirmacion,
  etiquetaMetodoAsistencia,
  etiquetaParticipacion,
  formatearHoraChile,
  textoPuntoRecogida,
} from '../../../core/utils/formato-servicio';

@Component({
  selector: 'app-conductor-pasajeros',
  templateUrl: './conductor-pasajeros.page.html',
  styleUrls: ['./conductor-pasajeros.page.scss'],
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
    IonBadge,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
  ],
})
export class ConductorPasajerosPage implements ViewWillEnter, ViewWillLeave, OnDestroy {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly alertas = inject(AlertController);
  private readonly refresco = crearRefrescoOperativo((contexto) => this.ejecutarCarga(contexto));
  private dialogoAbierto = false;
  private cierreManual: (() => void) | undefined;

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly listo = signal(false);
  readonly pasajeros = signal<PasajeroServicioConductor[]>([]);
  readonly estadoServicio = signal<EstadoServicio | null>(null);
  readonly registrandoId = signal<number | null>(null);
  readonly errorRegistro = signal<{ idPasajero: number; mensaje: string } | null>(null);

  readonly idServicio = Number(this.ruta.snapshot.paramMap.get('idServicio'));

  readonly presentacionAsistencia = presentacionAsistenciaTarjeta;
  readonly etiquetaMetodo = etiquetaMetodoAsistencia;
  readonly etiquetaParticipacion = etiquetaParticipacion;
  readonly etiquetaConfirmacion = etiquetaConfirmacion;
  readonly textoPuntoRecogida = textoPuntoRecogida;
  readonly formatearHoraAsistencia = formatearHoraChile;

  readonly resumen = computed(() => {
    const lista = this.pasajeros();
    return {
      total: lista.length,
      confirmados: lista.filter((pasajero) => pasajero.estadoConfirmacion === 'CONFIRMADO').length,
      validas: lista.filter((pasajero) => pasajero.estadoAsistencia === 'VALIDA').length,
      sinAsistencia: lista.filter((pasajero) => pasajero.estadoAsistencia === null).length,
      provisionales: lista.filter((pasajero) => pasajero.estadoAsistencia === 'PROVISIONAL').length,
      anuladas: lista.filter((pasajero) => pasajero.estadoAsistencia === 'ANULADA').length,
    };
  });

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

  puedeRegistrar(pasajero: PasajeroServicioConductor): boolean {
    return puedeRegistrarAsistenciaManual(this.estadoServicio(), pasajero);
  }

  async pedirRegistroManual(pasajero: PasajeroServicioConductor): Promise<void> {
    if (this.dialogoAbierto || this.registrandoId() !== null || !this.puedeRegistrar(pasajero)) {
      return;
    }

    this.dialogoAbierto = true;
    try {
      const alerta = await this.alertas.create({
        header: 'Registrar asistencia manual',
        message: MENSAJE_CONFIRMACION_ASISTENCIA_MANUAL,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Confirmar asistencia', role: 'confirm' },
        ],
      });
      await alerta.present();
      const { role } = await alerta.onDidDismiss();
      const decision = await ejecutarRegistroManual(
        async () => role,
        () => this.guardarAsistencia(pasajero.idPasajero),
      );
      if (!decision.confirmado) {
        return;
      }

      this.pasajeros.update((lista) => aplicarAsistenciaManual(lista, decision.respuesta));
      this.errorRegistro.set(null);
      this.cargar();
    } catch (err: unknown) {
      const estado = err instanceof HttpErrorResponse ? err.status : 0;
      const resultado = resultadoErrorAsistenciaManual(estado, this.auth.mensajeErrorHttp(err, ''));
      this.errorRegistro.set({ idPasajero: pasajero.idPasajero, mensaje: resultado.mensaje });
      if (resultado.refrescar) {
        this.cargar();
      }
    } finally {
      this.dialogoAbierto = false;
      this.registrandoId.set(null);
    }
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.cierreManual = () => evento.target.complete();
    this.refresco.solicitar(true);
  }

  private ejecutarCarga(contexto: ContextoRefresco): void {
    const { generacion, avisarError, automatico } = contexto;
    if (!Number.isInteger(this.idServicio) || this.idServicio <= 0) {
      this.cargando.set(false);
      this.pasajeros.set([]);
      this.error.set('El servicio indicado no es válido.');
      this.cerrarRefresco(generacion, avisarError);
      return;
    }

    if (!this.listo() && !automatico && !avisarError) {
      this.cargando.set(true);
    }

    forkJoin({
      pasajeros: this.api.listarPasajerosConductor(this.idServicio),
      detalle: this.api.obtenerDetalleConductor(this.idServicio).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ pasajeros, detalle }) => {
        if (!this.refresco.esVigente(generacion)) {
          this.cerrarRefresco(generacion, avisarError);
          return;
        }

        this.pasajeros.set(pasajeros);
        this.estadoServicio.set(detalle?.estado ?? this.estadoServicio());
        this.listo.set(true);
        this.cargando.set(false);
        this.error.set(null);
        this.cerrarRefresco(generacion, avisarError);
      },
      error: (err: unknown) => {
        if (!this.refresco.esVigente(generacion)) {
          this.cerrarRefresco(generacion, avisarError);
          return;
        }

        this.cargando.set(false);
        const decision = decidirErrorRefresco(this.listo(), avisarError);
        if (decision.mostrarError) {
          this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar los pasajeros.'));
        }

        this.cerrarRefresco(generacion, avisarError);
      },
    });
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

  private guardarAsistencia(idPasajero: number): Promise<AsistenciaRespuesta> {
    this.registrandoId.set(idPasajero);
    this.errorRegistro.set(null);
    return new Promise((resolve, reject) => {
      this.api.registrarAsistenciaManualConductor(this.idServicio, idPasajero).subscribe({
        next: (respuesta) => resolve(respuesta),
        error: (err: unknown) => reject(err),
      });
    });
  }
}
