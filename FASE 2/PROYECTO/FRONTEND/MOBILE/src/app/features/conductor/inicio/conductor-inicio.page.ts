import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
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
  ViewWillLeave,
} from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { EstadoServicio, ServicioConductorResumen } from '../../../core/models/conductor';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  colorEstadoServicio,
  etiquetaEstadoServicio,
  fechaLocalDesplazada,
  fechaLocalHoy,
  formatearFechaChile,
  formatearHoraPlanificada,
  textoCancelacion,
  tieneTexto,
} from '../../../core/utils/formato-servicio';
import { actualizarVistaServicios, ocultarDestacado } from '../../../core/utils/composicion-listas';
import { evaluarInicioConductor, horaAperturaInicio } from '../../../core/utils/inicio-conductor';
import {
  ContextoRefresco,
  crearRefrescoOperativo,
  decidirErrorRefresco,
} from '../../../core/utils/refresco-operativo';
import { BienvenidaModalComponent } from '../../../shared/bienvenida/bienvenida-modal.component';

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
    BienvenidaModalComponent,
  ],
})
export class ConductorInicioPage implements ViewWillEnter, ViewWillLeave, OnDestroy {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastController);
  private readonly refresco = crearRefrescoOperativo((contexto) => this.ejecutarCarga(contexto));
  private pedidoHistorial = 0;
  private cierreManual: (() => void) | undefined;

  readonly cargando = signal(true);
  readonly bienvenidaAbierta = signal(false);
  readonly error = signal<string | null>(null);
  readonly listadoListo = signal(false);
  readonly actuales = signal<ServicioConductorResumen[]>([]);
  readonly pendientesAnteriores = signal<ServicioConductorResumen[]>([]);
  private readonly finalizadosHoy = signal<ServicioConductorResumen[]>([]);

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

  private ejecutarCarga(contexto: ContextoRefresco): void {
    const { generacion, avisarError, automatico } = contexto;
    if (!this.listadoListo() && !automatico && !avisarError) {
      this.cargando.set(true);
    }

    const hoy = fechaLocalHoy();
    forkJoin({
      actuales: this.api.listarConductor({ desde: hoy }),
      anteriores: this.api.listarConductor({ hasta: fechaLocalDesplazada(-1) }),
    }).subscribe({
      next: ({ actuales, anteriores }) => {
        if (!this.refresco.esVigente(generacion)) {
          this.cerrarRefresco(generacion, avisarError);
          return;
        }

        this.aplicarOperativos(actuales, anteriores, hoy);
        this.listadoListo.set(true);
        this.cargando.set(false);
        this.error.set(null);
        this.mostrarBienvenida();
        if (this.historialVisible()) {
          this.cargarHistorial(() => this.cerrarRefresco(generacion, avisarError), true, avisarError);
          return;
        }

        this.cerrarRefresco(generacion, avisarError);
      },
      error: (err: unknown) => {
        if (!this.refresco.esVigente(generacion)) {
          this.cerrarRefresco(generacion, avisarError);
          return;
        }

        this.cargando.set(false);
        this.mostrarBienvenida();
        this.aplicarErrorListado(err, avisarError);
        this.cerrarRefresco(generacion, avisarError);
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
    this.cierreManual = () => evento.target.complete();
    this.refresco.solicitar(true);
  }

  proximo(): ServicioConductorResumen | null {
    const enCurso = [...this.pendientesAnteriores(), ...this.actuales()].find(
      (servicio) => servicio.estado === 'EN_CURSO',
    );
    if (enCurso) {
      return enCurso;
    }

    return this.actuales().find((servicio) => servicio.estado === 'PROGRAMADO') ?? null;
  }

  actualesVisibles(): ServicioConductorResumen[] {
    return ocultarDestacado(this.actuales(), (servicio) => servicio.idServicio, this.proximo()?.idServicio);
  }

  pendientesVisibles(): ServicioConductorResumen[] {
    return ocultarDestacado(
      this.pendientesAnteriores(),
      (servicio) => servicio.idServicio,
      this.proximo()?.idServicio,
    );
  }

  avisoInicio(servicio: ServicioConductorResumen): string | null {
    if (servicio.estado !== 'PROGRAMADO') {
      return null;
    }

    const disponibilidad = evaluarInicioConductor(servicio.fecha, servicio.horaInicio);
    if (disponibilidad === 'antes') {
      return `Podrás iniciar desde las ${horaAperturaInicio(servicio.horaInicio)}.`;
    }

    if (disponibilidad === 'vencido') {
      return 'El plazo de inicio ya terminó.';
    }

    return null;
  }

  abrirDetalle(idServicio: number): void {
    void this.router.navigate(['/conductor/servicios', idServicio]);
  }

  abrirQr(idServicio: number): void {
    void this.router.navigate(['/conductor/servicios', idServicio, 'qr']);
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  abrirPerfil(): void {
    void this.router.navigateByUrl('/perfil');
  }

  nombreBienvenida(): string | null {
    return this.auth.nombreCompleto();
  }

  fechaBienvenida(): string | null {
    const proximo = this.proximo();
    return proximo ? formatearFechaChile(proximo.fecha) : null;
  }

  horarioBienvenida(): string | null {
    const proximo = this.proximo();
    if (!proximo) {
      return null;
    }

    return `${formatearHoraPlanificada(proximo.horaInicio)} – ${formatearHoraPlanificada(proximo.horaFin)}`;
  }

  cerrarBienvenida(): void {
    this.bienvenidaAbierta.set(false);
  }

  private mostrarBienvenida(): void {
    if (this.auth.consumirBienvenida()) {
      this.bienvenidaAbierta.set(true);
    }
  }

  private cargarHistorial(alTerminar?: () => void, silencioso = false, avisarError = false): void {
    const pedido = ++this.pedidoHistorial;
    const conservar = silencioso || this.historial().length > 0;
    if (!conservar) {
      this.cargandoHistorial.set(true);
    }

    if (!conservar) {
      this.errorHistorial.set(null);
    }

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

          const vista = actualizarVistaServicios(this.vistaActual(), {
            desdeHoy: [...this.actuales(), ...this.finalizadosHoy()],
            anteriores: this.pendientesAnteriores(),
            historialConsultado: servicios,
            hoy: fechaLocalHoy(),
            id: (servicio) => servicio.idServicio,
            estado: (servicio) => servicio.estado,
            fecha: (servicio) => servicio.fecha,
          });
          this.historial.set(vista.historial.sort(compararMasRecientePrimero));
          this.cargandoHistorial.set(false);
          this.errorHistorial.set(null);
          alTerminar?.();
        },
        error: (err: unknown) => {
          if (pedido !== this.pedidoHistorial) {
            alTerminar?.();
            return;
          }

          this.cargandoHistorial.set(false);
          const decision = decidirErrorRefresco(this.historial().length > 0, avisarError && silencioso);
          if (decision.mostrarError) {
            this.errorHistorial.set(
              this.auth.mensajeErrorHttp(err, 'No fue posible cargar los servicios finalizados.'),
            );
          } else if (decision.mostrarAviso) {
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

    if (servicio.estado !== 'PROGRAMADO') {
      return null;
    }

    if (evaluarInicioConductor(servicio.fecha, servicio.horaInicio) === 'vencido') {
      return 'El plazo de inicio ya terminó.';
    }

    return 'Fecha anterior · pendiente de iniciar';
  }

  textoCancelado(estado: EstadoServicio, motivo: string | null | undefined): string | null {
    return textoCancelacion(estado, motivo);
  }

  private aplicarOperativos(
    actuales: ServicioConductorResumen[],
    anteriores: ServicioConductorResumen[],
    hoy: string,
  ): void {
    const vista = actualizarVistaServicios(this.vistaActual(), {
      desdeHoy: actuales,
      anteriores,
      historialConsultado: null,
      hoy,
      id: (servicio) => servicio.idServicio,
      estado: (servicio) => servicio.estado,
      fecha: (servicio) => servicio.fecha,
    });
    this.actuales.set(vista.operativos);
    this.pendientesAnteriores.set(vista.pendientes.sort(compararMasAntiguoPrimero));
    this.finalizadosHoy.set(vista.finalizadosHoy);
    this.historial.set(vista.historial.sort(compararMasRecientePrimero));
  }

  private vistaActual(): {
    operativos: ServicioConductorResumen[];
    pendientes: ServicioConductorResumen[];
    finalizadosHoy: ServicioConductorResumen[];
    historial: ServicioConductorResumen[];
  } {
    return {
      operativos: this.actuales(),
      pendientes: this.pendientesAnteriores(),
      finalizadosHoy: this.finalizadosHoy(),
      historial: this.historial(),
    };
  }

  private aplicarErrorListado(err: unknown, avisarError: boolean): void {
    const decision = decidirErrorRefresco(this.listadoListo(), avisarError);
    if (decision.mostrarError) {
      this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar tus servicios.'));
      return;
    }

    if (decision.mostrarAviso) {
      this.avisarRefreshFallido();
    }
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

  private avisarRefreshFallido(): void {
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
