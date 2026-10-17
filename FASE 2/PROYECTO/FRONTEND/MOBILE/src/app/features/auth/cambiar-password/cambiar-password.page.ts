import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { CampoPasswordComponent } from '../../../shared/campo-password/campo-password.component';
import { MENSAJE_PASSWORD, PATRON_PASSWORD } from '../../../core/constants/auth';

function confirmarPassword(grupo: AbstractControl): ValidationErrors | null {
  const password = grupo.get('passwordNueva')?.value;
  const confirmar = grupo.get('confirmarPassword')?.value;
  if (!password || !confirmar || password === confirmar) {
    return null;
  }

  return { confirmar: true };
}

@Component({
  selector: 'app-cambiar-password',
  templateUrl: './cambiar-password.page.html',
  styleUrls: ['./cambiar-password.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonNote,
    IonSpinner,
    CampoPasswordComponent,
  ],
})
export class CambiarPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly voluntario = this.ruta.snapshot.data['voluntario'] === true;

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensajePolitica = MENSAJE_PASSWORD;

  readonly form = this.fb.nonNullable.group(
    {
      passwordActual: ['', Validators.required],
      passwordNueva: ['', [Validators.required, Validators.pattern(PATRON_PASSWORD)]],
      confirmarPassword: ['', Validators.required],
    },
    { validators: confirmarPassword },
  );

  enviar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    const { passwordActual, passwordNueva } = this.form.getRawValue();
    this.auth.cambiarPassword({ passwordActual, passwordNueva }).subscribe({
      next: () => {
        this.enviando.set(false);
        void this.router.navigateByUrl(this.auth.rutaInicio());
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible cambiar la contraseña.'));
      },
    });
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  volver(): void {
    void this.router.navigateByUrl('/perfil');
  }
}
