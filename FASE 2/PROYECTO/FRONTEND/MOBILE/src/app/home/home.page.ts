import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
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
import { AuthService } from '../core/auth/auth.service';
import { MisServiciosService } from '../core/services/mis-servicios.service';
import { ServicioPasajeroResumen } from '../core/models/autenticacion';

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
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(true);
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

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
}
