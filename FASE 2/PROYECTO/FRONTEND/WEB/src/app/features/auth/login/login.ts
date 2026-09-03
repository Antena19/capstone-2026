import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Icon } from '../../../shared/components/icon/icon';

export const CONCEPTO_TRAYEK =
  'Trayek nace del concepto de trayecto y representa la gestión digital del recorrido completo de un servicio de transporte, desde su planificación hasta su ejecución y control.';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly concepto = CONCEPTO_TRAYEK;
  readonly conceptoBreve =
    'Gestión digital del recorrido de un servicio de transporte: de la planificación a la ejecución y el control.';
  readonly bloques = [
    { titulo: 'Planificación', detalle: 'Servicios y rutas' },
    { titulo: 'Operación', detalle: 'Seguimiento de recorridos' },
    { titulo: 'Asistencia', detalle: 'Control mediante QR' },
    { titulo: 'Reportes', detalle: 'Planificado vs realizado' },
  ] as const;
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly anio = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    recordar: [false],
  });

  enviar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    const { email, password, recordar } = this.form.getRawValue();

    this.auth.iniciarSesion({ email, password }, recordar).subscribe({
      next: (respuesta) => {
        if (!this.auth.esRolAdministrador(respuesta.rol) || !this.auth.autenticado()) {
          this.enviando.set(false);
          this.error.set('No tiene permisos para acceder al panel administrativo.');
          return;
        }

        this.enviando.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err));
      },
    });
  }
}
