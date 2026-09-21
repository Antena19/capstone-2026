import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
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
import { PasajeroServicioConductor } from '../../../core/models/conductor';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  colorEstadoAsistencia,
  etiquetaConfirmacion,
  etiquetaEstadoAsistencia,
  etiquetaParticipacion,
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
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
  ],
})
export class ConductorPasajerosPage implements ViewWillEnter {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private pedidoPasajeros = 0;

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly listo = signal(false);
  readonly pasajeros = signal<PasajeroServicioConductor[]>([]);

  readonly idServicio = Number(this.ruta.snapshot.paramMap.get('idServicio'));

  readonly etiquetaAsistencia = etiquetaEstadoAsistencia;
  readonly colorAsistencia = colorEstadoAsistencia;
  readonly etiquetaParticipacion = etiquetaParticipacion;
  readonly etiquetaConfirmacion = etiquetaConfirmacion;
  readonly textoPuntoRecogida = textoPuntoRecogida;

  readonly resumen = computed(() => {
    const lista = this.pasajeros();
    return {
      total: lista.length,
      validas: lista.filter((pasajero) => pasajero.estadoAsistencia === 'VALIDA').length,
      sinAsistencia: lista.filter((pasajero) => pasajero.estadoAsistencia === null).length,
      provisionales: lista.filter((pasajero) => pasajero.estadoAsistencia === 'PROVISIONAL').length,
      anuladas: lista.filter((pasajero) => pasajero.estadoAsistencia === 'ANULADA').length,
    };
  });

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(alTerminar?: () => void): void {
    if (!Number.isInteger(this.idServicio) || this.idServicio <= 0) {
      this.cargando.set(false);
      this.pasajeros.set([]);
      this.error.set('El servicio indicado no es válido.');
      alTerminar?.();
      return;
    }

    const pedido = ++this.pedidoPasajeros;
    const silencioso = this.listo();
    if (!silencioso && !alTerminar) {
      this.cargando.set(true);
    }

    this.error.set(null);
    this.api.listarPasajerosConductor(this.idServicio).subscribe({
      next: (pasajeros) => {
        if (pedido !== this.pedidoPasajeros) {
          alTerminar?.();
          return;
        }

        this.pasajeros.set(pasajeros);
        this.listo.set(true);
        this.cargando.set(false);
        alTerminar?.();
      },
      error: (err: unknown) => {
        if (pedido !== this.pedidoPasajeros) {
          alTerminar?.();
          return;
        }

        this.cargando.set(false);
        if (!this.listo()) {
          this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar los pasajeros.'));
        }
        alTerminar?.();
      },
    });
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.cargar(() => evento.target.complete());
  }
}
