import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonNote,
    IonSpinner,
  ],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    identificador: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.auth.autenticado()) {
      void this.router.navigateByUrl('/home');
    }
  }

  enviar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    const { identificador, password } = this.form.getRawValue();
    this.auth.iniciarSesion({ identificador: identificador.trim(), password }).subscribe({
      next: (respuesta) => {
        if (!this.auth.esPasajero(respuesta.rol) || !this.auth.autenticado()) {
          this.auth.cerrarSesion();
          this.enviando.set(false);
          this.error.set('Esta aplicación es para pasajeros.');
          return;
        }

        this.enviando.set(false);
        void this.router.navigateByUrl('/home');
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible iniciar sesión.'));
      },
    });
  }
}
