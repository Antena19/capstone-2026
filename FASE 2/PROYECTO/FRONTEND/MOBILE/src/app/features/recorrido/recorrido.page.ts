import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { RutaMapa } from '../../core/models/ruta-mapa';
import { MisServiciosService } from '../../core/services/mis-servicios.service';
import { MapaRecorridoComponent } from '../../shared/mapa/mapa-recorrido.component';
import { tieneGeometria } from '../../shared/mapa/geometria-ruta';

type PerfilMapa = 'pasajero' | 'conductor';

@Component({
  selector: 'app-recorrido',
  templateUrl: './recorrido.page.html',
  styleUrl: './recorrido.page.scss',
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
    MapaRecorridoComponent,
  ],
})
export class RecorridoPage implements ViewWillEnter {
  private readonly rutaActiva = inject(ActivatedRoute);
  private readonly api = inject(MisServiciosService);
  private readonly auth = inject(AuthService);
  private pedido = 0;

  readonly perfil = signal<PerfilMapa>('pasajero');
  readonly idServicio = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly ruta = signal<RutaMapa | null>(null);
  readonly tieneGeometria = tieneGeometria;

  ionViewWillEnter(): void {
    const perfil = this.rutaActiva.snapshot.data['perfil'];
    this.perfil.set(perfil === 'conductor' ? 'conductor' : 'pasajero');
    this.cargar();
  }

  volver(): string {
    const id = this.idServicio();
    return this.perfil() === 'conductor'
      ? `/conductor/servicios/${id}`
      : `/pasajero/servicios/${id}`;
  }

  cargar(): void {
    const idServicio = Number(this.rutaActiva.snapshot.paramMap.get('idServicio'));
    this.idServicio.set(idServicio);
    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      this.cargando.set(false);
      this.ruta.set(null);
      this.error.set('El servicio indicado no es válido.');
      return;
    }

    const pedido = ++this.pedido;
    this.cargando.set(true);
    this.error.set(null);
    const consulta =
      this.perfil() === 'conductor'
        ? this.api.obtenerRutaConductor(idServicio)
        : this.api.obtenerRutaPasajero(idServicio);

    consulta.subscribe({
      next: (ruta) => {
        if (pedido !== this.pedido) {
          return;
        }

        this.ruta.set(ruta);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        if (pedido !== this.pedido) {
          return;
        }

        this.ruta.set(null);
        this.cargando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cargar el recorrido.'));
      },
    });
  }
}
