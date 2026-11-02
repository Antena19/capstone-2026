import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AVISO_RECUPERACION, RecuperacionPassword } from '../../../core/auth/recuperacion-password';
import { BLOQUES_ACCESO, CONCEPTO_TRAYEK } from '../login/login';

@Component({
  selector: 'app-recuperar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar.html',
  styleUrl: './recuperar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarPage {
  private readonly fb = inject(FormBuilder);
  private readonly recuperacion = inject(RecuperacionPassword);

  readonly concepto = CONCEPTO_TRAYEK;
  readonly bloques = BLOQUES_ACCESO;
  readonly aviso = AVISO_RECUPERACION;
  readonly disponible = this.recuperacion.disponible;
  readonly anio = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  mensajeCorreo(): string | null {
    const campo = this.form.controls.correo;
    if (!campo.touched || campo.valid) {
      return null;
    }

    return campo.hasError('email') ? 'Ingrese un correo válido.' : 'Ingrese su correo electrónico.';
  }

  enviar(): void {
    this.form.markAllAsTouched();
    if (!this.disponible || this.form.invalid) {
      return;
    }
  }
}
