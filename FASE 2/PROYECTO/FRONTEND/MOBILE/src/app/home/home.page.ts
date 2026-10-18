import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
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
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';
import { forkJoin } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { AsistenciaRespuesta } from '../core/models/asistencia';
import { EstadoAsistencia } from '../core/models/conductor';
import { ProximoServicioPasajero, ServicioPasajeroResumen } from '../core/models/pasajero';
import { AsistenciaService } from '../core/services/asistencia.service';
import { MisServiciosService } from '../core/services/mis-servicios.service';
import { actualizarVistaServicios, ocultarDestacado } from '../core/utils/composicion-listas';
import {
  colorConfirmacion,
  colorEstadoAsistencia,
  colorEstadoServicio,
  etiquetaAsistenciaListado,
  etiquetaConfirmacion,
  etiquetaEstadoServicio,
  fechaLocalDesplazada,
  fechaLocalHoy,
  formatearFechaChile,
  formatearHoraPlanificada,
  textoCancelacion,
  referenciaPuntoAporta,
  tieneTexto,
} from '../core/utils/formato-servicio';
import {
  ContextoRefresco,
  crearRefrescoOperativo,
  decidirErrorRefresco,
} from '../core/utils/refresco-operativo';
import { BienvenidaModalComponent } from '../shared/bienvenida/bienvenida-modal.component';

const DIAS_HISTORIAL = 14;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
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
export class HomePage implements ViewWillEnter, ViewWillLeave, OnDestroy {
  private readonly api = inject(MisServiciosService);
  private readonly asistencias = inject(AsistenciaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly avisos = inject(ToastController);
  private readonly refresco = crearRefrescoOperativo((contexto) => this.ejecutarCarga(contexto));
  private pedidoHistorial = 0;
  private cierreManual: (() => void) | undefined;

  readonly cargando = signal(true);
  readonly bienvenidaAbierta = signal(false);
  readonly escaneando = signal(false);
  readonly error = signal<string | null>(null);
  readonly listadoListo = signal(false);
  readonly proximo = signal<ProximoServicioPasajero | null>(null);
  readonly actuales = signal<ServicioPasajeroResumen[]>([]);
  private readonly finalizadosHoy = signal<ServicioPasajeroResumen[]>([]);

  readonly historialVisible = signal(false);
  readonly cargandoHistorial = signal(false);
  readonly errorHistorial = signal<string | null>(null);
  readonly historial = signal<ServicioPasajeroResumen[]>([]);
  readonly diasHistorial = DIAS_HISTORIAL;

  readonly formatearFecha = formatearFechaChile;
  readonly textoCancelacion = textoCancelacion;
  readonly formatearHora = formatearHoraPlanificada;
  readonly etiquetaEstado = etiquetaEstadoServicio;
  readonly colorEstado = colorEstadoServicio;
  readonly etiquetaConfirmacion = etiquetaConfirmacion;
  readonly colorConfirmacion = colorConfirmacion;
  readonly etiquetaAsistencia = etiquetaAsistenciaListado;
  readonly colorAsistencia = colorEstadoAsistencia;
  readonly referenciaPunto = referenciaPuntoAporta;
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

  actualesVisibles(): ServicioPasajeroResumen[] {
    return ocultarDestacado(this.actuales(), (servicio) => servicio.idServicio, this.proximo()?.idServicio);
  }

  textoAsistenciaProximo(servicio: ProximoServicioPasajero): string | null {
    return etiquetaAsistenciaListado(servicio.tieneAsistencia, servicio.estadoAsistencia);
  }

  colorAsistenciaEstado(estado: EstadoAsistencia | null | undefined): string {
    return colorEstadoAsistencia(estado);
  }

  private ejecutarCarga(contexto: ContextoRefresco): void {
    const { generacion, avisarError, automatico } = contexto;
    if (!this.listadoListo() && !automatico && !avisarError) {
      this.cargando.set(true);
    }

    const hoy = fechaLocalHoy();
    forkJoin({
      proximo: this.api.obtenerProximoPasajero(),
      actuales: this.api.listarPasajero({ desde: hoy }),
    }).subscribe({
      next: ({ proximo, actuales }) => {
        if (!this.refresco.esVigente(generacion)) {
          this.cerrarRefresco(generacion, avisarError);
          return;
        }

        this.proximo.set(proximo);
        const vista = actualizarVistaServicios(this.vistaActual(), {
          desdeHoy: actuales,
          anteriores: [],
          historialConsultado: null,
          hoy,
          id: (servicio) => servicio.idServicio,
          estado: (servicio) => servicio.estadoServicio,
          fecha: (servicio) => servicio.fecha,
        });
        this.actuales.set(vista.operativos.sort(compararMasAntiguoPrimero));
        this.finalizadosHoy.set(vista.finalizadosHoy);
        this.historial.set(vista.historial.sort(compararMasRecientePrimero));
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

  abrirDetalle(idServicio: number): void {
    void this.router.navigate(['/pasajero/servicios', idServicio]);
  }

  async escanearQr(): Promise<void> {
    if (this.escaneando()) {
      return;
    }

    this.escaneando.set(true);

    try {
      const lectura = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Apunta al código QR del conductor',
        scanButton: false,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.PORTRAIT,
      });
      const token = lectura.ScanResult;
      if (!token) {
        this.escaneando.set(false);
        await this.avisar('No se pudo leer el código QR.');
        return;
      }

      this.registrarAsistencia(token);
    } catch (error: unknown) {
      this.escaneando.set(false);
      if (esCancelacionEscaneo(error)) {
        return;
      }

      await this.avisar(mensajeErrorEscaneo(error));
    }
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
      this.errorHistorial.set(null);
    }

    this.api
      .listarPasajero({
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
            anteriores: [],
            historialConsultado: servicios,
            hoy: fechaLocalHoy(),
            id: (servicio) => servicio.idServicio,
            estado: (servicio) => servicio.estadoServicio,
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

  private registrarAsistencia(token: string): void {
    this.asistencias.escanear(token).subscribe({
      next: (asistencia) => {
        this.escaneando.set(false);
        void this.confirmarAsistencia(asistencia);
        this.cargar();
      },
      error: (err: unknown) => {
        this.escaneando.set(false);
        void this.avisar(this.auth.mensajeErrorHttp(err, 'No fue posible registrar la asistencia.'));
      },
    });
  }

  private async confirmarAsistencia(asistencia: AsistenciaRespuesta): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Asistencia registrada',
      message: textoConfirmacionAsistencia(asistencia),
      buttons: ['Aceptar'],
    });
    await alerta.present();
  }

  private async avisar(mensaje: string): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'No se registró la asistencia',
      message: mensaje,
      buttons: ['Aceptar'],
    });
    await alerta.present();
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

  private vistaActual(): {
    operativos: ServicioPasajeroResumen[];
    pendientes: ServicioPasajeroResumen[];
    finalizadosHoy: ServicioPasajeroResumen[];
    historial: ServicioPasajeroResumen[];
  } {
    return {
      operativos: this.actuales(),
      pendientes: [],
      finalizadosHoy: this.finalizadosHoy(),
      historial: this.historial(),
    };
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

function compararMasRecientePrimero(a: ServicioPasajeroResumen, b: ServicioPasajeroResumen): number {
  if (a.fecha !== b.fecha) {
    return a.fecha < b.fecha ? 1 : -1;
  }

  if (a.horaInicio !== b.horaInicio) {
    return a.horaInicio < b.horaInicio ? 1 : -1;
  }

  return b.idServicio - a.idServicio;
}

function compararMasAntiguoPrimero(a: ServicioPasajeroResumen, b: ServicioPasajeroResumen): number {
  return compararMasRecientePrimero(b, a);
}

function textoConfirmacionAsistencia(asistencia: AsistenciaRespuesta): string {
  const lineas = ['Asistencia registrada correctamente.', `Servicio #${asistencia.idServicio}`];
  if (asistencia.excedeCapacidad) {
    lineas.push('El vehículo superó su capacidad. Tu registro quedó anotado.');
  }

  return lineas.join('\n');
}

function esCancelacionEscaneo(error: unknown): boolean {
  const mensaje = textoError(error).toLowerCase();
  return mensaje.includes('cancel') || mensaje.includes('cancelled') || mensaje.includes('canceled');
}

function mensajeErrorEscaneo(error: unknown): string {
  const mensaje = textoError(error).toLowerCase();
  if (mensaje.includes('permission') || mensaje.includes('permiso') || mensaje.includes('denied')) {
    return 'Se necesita permiso de cámara para escanear el QR.';
  }

  return 'No fue posible abrir el escáner. En el navegador, usa un dispositivo con cámara o la aplicación Android.';
}

function textoError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return typeof error === 'string' ? error : '';
}
