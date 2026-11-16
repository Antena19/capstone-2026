import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  contrasenasCoinciden,
  MENSAJE_POLITICA_PASSWORD,
  politicaPassword,
} from '../../../core/auth/politica-password';
import { AVISO_RECUPERACION, RecuperacionPassword } from '../../../core/auth/recuperacion-password';
import { BLOQUES_ACCESO, CONCEPTO_TRAYEK } from '../login/login';

@Component({
  selector: 'app-restablecer',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './restablecer.html',
  styleUrl: './restablecer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerPage {
  private readonly fb = inject(FormBuilder);
  private readonly recuperacion = inject(RecuperacionPassword);

  readonly concepto = CONCEPTO_TRAYEK;
  readonly bloques = BLOQUES_ACCESO;
  readonly aviso = AVISO_RECUPERACION;
  readonly politica = MENSAJE_POLITICA_PASSWORD;
  readonly disponible = this.recuperacion.disponible;
  readonly anio = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group(
    {
      passwordNueva: ['', [Validators.required, Validators.maxLength(100), politicaPassword()]],
      passwordConfirm: ['', [Validators.required]],
    },
    { validators: [contrasenasCoinciden()] },
  );

  mensajePassword(): string | null {
    const campo = this.form.controls.passwordNueva;
    if (!campo.touched || campo.valid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('passwordPolitica') || campo.hasError('maxlength')) {
      return this.politica;
    }

    return 'Dato inválido.';
  }

  mensajeConfirmacion(): string | null {
    const campo = this.form.controls.passwordConfirm;
    if (!campo.touched) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (this.form.hasError('passwordMismatch')) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  }

  enviar(): void {
    this.form.markAllAsTouched();
    if (!this.disponible || this.form.invalid) {
      return;
    }
  }
}
