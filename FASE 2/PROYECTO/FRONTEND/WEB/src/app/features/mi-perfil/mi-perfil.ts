import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CambiarPasswordSolicitud } from '../../core/models/autenticacion';
import { EditarAdministradorSolicitud, Usuario } from '../../core/models/usuario';
import { FeedbackService } from '../../core/services/feedback.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { Modal } from '../../shared/components/modal/modal';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { PasswordForm } from './password-form';
import { PerfilForm } from './perfil-form';

@Component({
  selector: 'app-mi-perfil',
  imports: [DatePipe, PageHeader, ActionButton, AppCard, StatusBadge, Modal, PerfilForm, PasswordForm],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPerfilPage {
  private readonly api = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly feedback = inject(FeedbackService);

  readonly perfil = signal<Usuario | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly formularioPerfilAbierto = signal(false);
  readonly guardandoPerfil = signal(false);
  readonly errorPerfil = signal<string | null>(null);

  readonly formularioPasswordAbierto = signal(false);
  readonly guardandoPassword = signal(false);
  readonly errorPassword = signal<string | null>(null);

  readonly subtitulo = 'Administra los datos y la seguridad de tu cuenta.';

  readonly rolVisible = computed(() => {
    const rol = this.perfil()?.rol;
    return rol === 'ADMINISTRADOR' ? 'Administrador' : (rol ?? '—');
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.api.obtenerMiPerfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar tu perfil.'));
      },
    });
  }

  abrirEditarPerfil(): void {
    this.errorPerfil.set(null);
    this.formularioPerfilAbierto.set(true);
  }

  cerrarEditarPerfil(): void {
    if (this.guardandoPerfil()) {
      return;
    }

    this.formularioPerfilAbierto.set(false);
    this.errorPerfil.set(null);
  }

  guardarPerfil(solicitud: EditarAdministradorSolicitud): void {
    if (this.guardandoPerfil()) {
      return;
    }

    this.guardandoPerfil.set(true);
    this.errorPerfil.set(null);

    this.api.actualizarMiPerfil(solicitud).subscribe({
      next: (perfil) => {
        this.guardandoPerfil.set(false);
        this.formularioPerfilAbierto.set(false);
        this.perfil.set(perfil);
        this.auth.actualizarEmailSesion(perfil.email);
        this.feedback.mostrar('Perfil actualizado correctamente.');
      },
      error: (err: unknown) => {
        this.guardandoPerfil.set(false);
        this.errorPerfil.set(mensajeErrorHttp(err, 'No fue posible actualizar el perfil.'));
      },
    });
  }

  abrirCambiarPassword(): void {
    this.errorPassword.set(null);
    this.formularioPasswordAbierto.set(true);
  }

  cerrarCambiarPassword(): void {
    if (this.guardandoPassword()) {
      return;
    }

    this.formularioPasswordAbierto.set(false);
    this.errorPassword.set(null);
  }

  guardarPassword(solicitud: CambiarPasswordSolicitud): void {
    if (this.guardandoPassword()) {
      return;
    }

    this.guardandoPassword.set(true);
    this.errorPassword.set(null);

    this.auth.cambiarPassword(solicitud).subscribe({
      next: () => {
        this.guardandoPassword.set(false);
        this.formularioPasswordAbierto.set(false);
        this.feedback.mostrar('Contraseña actualizada correctamente.');
      },
      error: (err: unknown) => {
        this.guardandoPassword.set(false);
        this.errorPassword.set(mensajeErrorHttp(err, 'No fue posible actualizar la contraseña.'));
      },
    });
  }
}
