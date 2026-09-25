import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
  referenciaPuntoAporta,
  tieneTexto,
} from '../core/utils/formato-servicio';

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
  ],
})
export class HomePage implements ViewWillEnter {
  private readonly api = inject(MisServiciosService);
  private readonly asistencias = inject(AsistenciaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly avisos = inject(ToastController);
  private pedidoListado = 0;
  private pedidoHistorial = 0;
  private cicloCarga = 0;
  private cicloConAviso = 0;

  readonly cargando = signal(true);
  readonly escaneando = signal(false);
  readonly error = signal<string | null>(null);
  readonly listadoListo = signal(false);
  readonly proximo = signal<ProximoServicioPasajero | null>(null);
  readonly actuales = signal<ServicioPasajeroResumen[]>([]);

  readonly historialVisible = signal(false);
  readonly cargandoHistorial = signal(false);
  readonly errorHistorial = signal<string | null>(null);
  readonly historial = signal<ServicioPasajeroResumen[]>([]);
  readonly diasHistorial = DIAS_HISTORIAL;

  readonly formatearFecha = formatearFechaChile;
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
    this.cargar();
  }

  actualesVisibles(): ServicioPasajeroResumen[] {
    const idProximo = this.proximo()?.idServicio;
    if (!idProximo) {
      return this.actuales();
    }

    return this.actuales().filter((servicio) => servicio.idServicio !== idProximo);
  }

  textoAsistenciaProximo(servicio: ProximoServicioPasajero): string | null {
    return etiquetaAsistenciaListado(servicio.tieneAsistencia, servicio.estadoAsistencia);
  }

  colorAsistenciaEstado(estado: EstadoAsistencia | null | undefined): string {
    return colorEstadoAsistencia(estado);
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
      proximo: this.api.obtenerProximoPasajero(),
      actuales: this.api.listarPasajero({ desde: hoy }),
    }).subscribe({
      next: ({ proximo, actuales }) => {
        if (pedido !== this.pedidoListado) {
          alTerminar?.();
          return;
        }

        this.proximo.set(proximo);
        this.actuales.set([...actuales].sort(compararMasAntiguoPrimero));
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

  private cargarHistorial(alTerminar?: () => void, silencioso = false): void {
    const pedido = ++this.pedidoHistorial;
    const conservar = silencioso || this.historial().length > 0;
    if (!conservar) {
      this.cargandoHistorial.set(true);
    }

    this.errorHistorial.set(null);
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

          this.historial.set([...servicios].sort(compararMasRecientePrimero));
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
