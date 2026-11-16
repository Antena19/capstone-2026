import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CambiarPasswordSolicitud } from '../../../core/models/autenticacion';
import { FeedbackService } from '../../../core/services/feedback.service';
import { mensajeErrorHttp } from '../../../core/utils/http-error';
import { Icon } from '../../../shared/components/icon/icon';
import { PasswordForm } from '../../mi-perfil/password-form';

@Component({
  selector: 'app-cambiar-password',
  imports: [Icon, PasswordForm],
  templateUrl: './cambiar-password.html',
  styleUrl: './cambiar-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  guardar(solicitud: CambiarPasswordSolicitud): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.auth.cambiarPassword(solicitud).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.feedback.mostrar(respuesta.mensaje || 'Contraseña actualizada correctamente.');
        void this.router.navigateByUrl(this.auth.rutaInicio());
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible actualizar la contraseña.'));
      },
    });
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
}
