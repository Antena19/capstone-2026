import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
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
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ServicioConductorResumen } from '../../../core/models/conductor';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  colorEstadoServicio,
  etiquetaEstadoServicio,
  fechaLocalDesplazada,
  fechaLocalHoy,
  formatearFechaChile,
  formatearHoraPlanificada,
  tieneTexto,
} from '../../../core/utils/formato-servicio';

const DIAS_HISTORIAL = 14;

@Component({
  selector: 'app-conductor-inicio',
  templateUrl: './conductor-inicio.page.html',
  styleUrls: ['./conductor-inicio.page.scss'],
  imports: [
    NgTemplateOutlet,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonSpinner,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
  ],
})
export class ConductorInicioPage implements ViewWillEnter {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastController);
  private pedidoListado = 0;
  private pedidoHistorial = 0;
  private cicloCarga = 0;
  private cicloConAviso = 0;

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly listadoListo = signal(false);
  readonly actuales = signal<ServicioConductorResumen[]>([]);
  readonly pendientesAnteriores = signal<ServicioConductorResumen[]>([]);

  readonly historialVisible = signal(false);
  readonly cargandoHistorial = signal(false);
  readonly errorHistorial = signal<string | null>(null);
  readonly historial = signal<ServicioConductorResumen[]>([]);
  readonly diasHistorial = DIAS_HISTORIAL;

  readonly formatearFecha = formatearFechaChile;
  readonly formatearHora = formatearHoraPlanificada;
  readonly etiquetaEstado = etiquetaEstadoServicio;
  readonly colorEstado = colorEstadoServicio;
  readonly tieneTexto = tieneTexto;

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(alTerminar?: () => void): void {
    const pedido = ++this.pedidoListado;
    this.cicloCarga += 1;
    const silencioso = this.listadoListo();
    if (!silencioso && !alTerminar) {
      this.cargando.set(true);
    }

    this.error.set(null);
    const hoy = fechaLocalHoy();
    forkJoin({
      actuales: this.api.listarConductor({ desde: hoy }),
      anteriores: this.api.listarConductor({ hasta: fechaLocalDesplazada(-1) }),
    }).subscribe({
      next: ({ actuales, anteriores }) => {
        if (pedido !== this.pedidoListado) {
          alTerminar?.();
          return;
        }

        this.aplicarOperativos(actuales, anteriores, hoy);
        this.listadoListo.set(true);
        this.cargando.set(false);
        if (this.historialVisible()) {
          this.cargarHistorial(alTerminar, true);
          return;
        }

        alTerminar?.();
      },
      error: (err: unknown) => {
        if (pedido !== this.pedidoListado) {
          alTerminar?.();
          return;
        }

        this.cargando.set(false);
        if (!this.listadoListo()) {
          this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar tus servicios.'));
        } else {
          this.avisarRefreshFallido();
        }
        alTerminar?.();
      },
    });
  }

  verHistorial(): void {
    this.historialVisible.set(true);
    this.cargarHistorial();
  }

  ocultarHistorial(): void {
    this.historialVisible.set(false);
    this.errorHistorial.set(null);
    this.cargandoHistorial.set(false);
  }

  reintentarHistorial(): void {
    this.cargarHistorial();
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.cargar(() => evento.target.complete());
  }

  abrirDetalle(idServicio: number): void {
    void this.router.navigate(['/conductor/servicios', idServicio]);
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  private cargarHistorial(alTerminar?: () => void, silencioso = false): void {
    const pedido = ++this.pedidoHistorial;
    const conservar = silencioso || this.historial().length > 0;
    if (!conservar) {
      this.cargandoHistorial.set(true);
    }

    this.errorHistorial.set(null);
    this.api
      .listarConductor({
        desde: fechaLocalDesplazada(-DIAS_HISTORIAL),
        hasta: fechaLocalDesplazada(-1),
      })
      .subscribe({
        next: (servicios) => {
          if (pedido !== this.pedidoHistorial) {
            alTerminar?.();
            return;
          }

          this.historial.set(this.filtrarHistorial(servicios));
          this.cargandoHistorial.set(false);
          alTerminar?.();
        },
        error: (err: unknown) => {
          if (pedido !== this.pedidoHistorial) {
            alTerminar?.();
            return;
          }

          this.cargandoHistorial.set(false);
          if (this.historial().length === 0) {
            this.errorHistorial.set(
              this.auth.mensajeErrorHttp(err, 'No fue posible cargar los servicios anteriores.'),
            );
          } else if (silencioso) {
            this.avisarRefreshFallido();
          }
          alTerminar?.();
        },
      });
  }

  avisoPendiente(servicio: ServicioConductorResumen): string | null {
    if (servicio.estado === 'EN_CURSO') {
      return 'Fecha anterior · pendiente de finalizar';
    }

    if (servicio.estado === 'PROGRAMADO') {
      return 'Fecha anterior · pendiente de iniciar';
    }

    return null;
  }

  private aplicarOperativos(
    actuales: ServicioConductorResumen[],
    anteriores: ServicioConductorResumen[],
    hoy: string,
  ): void {
    const idsActuales = new Set(actuales.map((servicio) => servicio.idServicio));
    const pendientes = anteriores
      .filter(
        (servicio) =>
          servicio.fecha < hoy &&
          !idsActuales.has(servicio.idServicio) &&
          (servicio.estado === 'EN_CURSO' || servicio.estado === 'PROGRAMADO'),
      )
      .sort(compararMasAntiguoPrimero);

    this.actuales.set(actuales);
    this.pendientesAnteriores.set(pendientes);
    this.historial.update((lista) => this.filtrarHistorial(lista));
  }

  private filtrarHistorial(servicios: ServicioConductorResumen[]): ServicioConductorResumen[] {
    const visibles = new Set([
      ...this.actuales().map((servicio) => servicio.idServicio),
      ...this.pendientesAnteriores().map((servicio) => servicio.idServicio),
    ]);

    return servicios
      .filter((servicio) => !visibles.has(servicio.idServicio))
      .sort(compararMasRecientePrimero);
  }

  private avisarRefreshFallido(): void {
    if (this.cicloConAviso === this.cicloCarga) {
      return;
    }

    this.cicloConAviso = this.cicloCarga;
    void this.avisos
      .create({
        message: 'No se pudo actualizar la información.',
        duration: 2500,
        position: 'bottom',
      })
      .then((aviso) => aviso.present());
  }
}

function compararMasRecientePrimero(a: ServicioConductorResumen, b: ServicioConductorResumen): number {
  if (a.fecha !== b.fecha) {
    return a.fecha < b.fecha ? 1 : -1;
  }

  if (a.horaInicio !== b.horaInicio) {
    return a.horaInicio < b.horaInicio ? 1 : -1;
  }

  return b.idServicio - a.idServicio;
}

function compararMasAntiguoPrimero(a: ServicioConductorResumen, b: ServicioConductorResumen): number {
  return compararMasRecientePrimero(b, a);
}
