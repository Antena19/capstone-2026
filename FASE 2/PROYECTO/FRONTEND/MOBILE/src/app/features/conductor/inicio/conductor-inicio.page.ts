import { Component, inject, OnInit, signal } from '@angular/core';
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
} from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { ServicioConductorResumen } from '../../../core/models/conductor';
import { MisServiciosService } from '../../../core/services/mis-servicios.service';
import {
  colorEstadoServicio,
  etiquetaEstadoServicio,
  fechaLocalHoy,
  formatearFechaChile,
  formatearHoraPlanificada,
  tieneTexto,
} from '../../../core/utils/formato-servicio';

@Component({
  selector: 'app-conductor-inicio',
  templateUrl: './conductor-inicio.page.html',
  styleUrls: ['./conductor-inicio.page.scss'],
  imports: [
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
export class ConductorInicioPage implements OnInit {
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly servicios = signal<ServicioConductorResumen[]>([]);

  readonly formatearFecha = formatearFechaChile;
  readonly formatearHora = formatearHoraPlanificada;
  readonly etiquetaEstado = etiquetaEstadoServicio;
  readonly colorEstado = colorEstadoServicio;
  readonly tieneTexto = tieneTexto;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(alTerminar?: () => void): void {
    if (!alTerminar) {
      this.cargando.set(true);
    }

    this.error.set(null);
    this.api.listarConductor(fechaLocalHoy()).subscribe({
      next: (servicios) => {
        this.servicios.set(servicios);
        this.cargando.set(false);
        alTerminar?.();
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar tus servicios.'));
        alTerminar?.();
      },
    });
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
}
