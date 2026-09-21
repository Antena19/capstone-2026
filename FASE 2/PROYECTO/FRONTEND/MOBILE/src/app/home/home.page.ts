import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';
import { AuthService } from '../core/auth/auth.service';
import { AsistenciaRespuesta, EstadoAsistencia, TipoAsistencia } from '../core/models/asistencia';
import { ServicioPasajeroResumen } from '../core/models/autenticacion';
import { AsistenciaService } from '../core/services/asistencia.service';
import { MisServiciosService } from '../core/services/mis-servicios.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
  ],
})
export class HomePage implements OnInit {
  private readonly api = inject(MisServiciosService);
  private readonly asistencias = inject(AsistenciaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);

  readonly cargando = signal(true);
  readonly escaneando = signal(false);
  readonly error = signal<string | null>(null);
  readonly servicios = signal<ServicioPasajeroResumen[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar().subscribe({
      next: (servicios) => {
        this.servicios.set(servicios);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar tus servicios.'));
      },
    });
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

  private registrarAsistencia(token: string): void {
    this.asistencias.escanear(token).subscribe({
      next: (asistencia) => {
        this.escaneando.set(false);
        void this.confirmarAsistencia(asistencia);
      },
      error: (err: unknown) => {
        this.escaneando.set(false);
        void this.avisar(
          this.auth.mensajeErrorHttp(err, 'No fue posible registrar la asistencia.'),
        );
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
}

function textoConfirmacionAsistencia(asistencia: AsistenciaRespuesta): string {
  const lineas: string[] = [];
  const tipo = etiquetaTipoAsistencia(asistencia.tipoAsistencia);
  const estado = etiquetaEstadoAsistencia(asistencia.estado);

  if (tipo) {
    lineas.push(`Tipo: ${tipo}`);
  }

  if (estado) {
    lineas.push(`Estado: ${estado}`);
  }

  return lineas.length > 0 ? lineas.join('\n') : 'Tu asistencia quedó registrada.';
}

function etiquetaTipoAsistencia(tipo: TipoAsistencia | undefined): string | null {
  if (tipo === 'PLANIFICADA') {
    return 'Planificada';
  }

  if (tipo === 'NO_PLANIFICADA') {
    return 'No planificada';
  }

  return null;
}

function etiquetaEstadoAsistencia(estado: EstadoAsistencia | undefined): string | null {
  if (estado === 'VALIDA') {
    return 'Válida';
  }

  if (estado === 'PROVISIONAL') {
    return 'Provisional';
  }

  if (estado === 'ANULADA') {
    return 'Anulada';
  }

  return null;
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
