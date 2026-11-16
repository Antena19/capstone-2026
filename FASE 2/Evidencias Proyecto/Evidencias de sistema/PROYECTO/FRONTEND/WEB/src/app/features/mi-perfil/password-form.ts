import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { contrasenasCoinciden, MENSAJE_POLITICA_PASSWORD, politicaPassword } from '../../core/auth/politica-password';
import { CambiarPasswordSolicitud } from '../../core/models/autenticacion';
import { ActionButton } from '../../shared/components/action-button/action-button';

@Component({
  selector: 'app-password-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './password-form.html',
  styleUrl: './password-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordForm {
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly mostrarCancelar = input(true);
  readonly etiquetaCancelar = input('Cancelar');
  readonly guardado = output<CambiarPasswordSolicitud>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group(
    {
      passwordActual: ['', [Validators.required]],
      passwordNueva: [
        '',
        [Validators.required, Validators.maxLength(100), politicaPassword()],
      ],
      passwordConfirm: ['', [Validators.required]],
    },
    { validators: [contrasenasCoinciden()] },
  );

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        this.form.reset({
          passwordActual: '',
          passwordNueva: '',
          passwordConfirm: '',
        });
        return;
      }

      this.form.reset({
        passwordActual: '',
        passwordNueva: '',
        passwordConfirm: '',
      });
    });
  }

  enviar(): void {
    if (this.guardando()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const datos = this.form.getRawValue();
    this.guardado.emit({
      passwordActual: datos.passwordActual,
      passwordNueva: datos.passwordNueva,
    });
  }

  mensajeCampo(control: 'passwordActual' | 'passwordNueva' | 'passwordConfirm'): string | null {
    const campo = this.form.controls[control];
    const grupoInvalido = this.form.hasError('passwordMismatch');

    if (control === 'passwordConfirm' && campo.touched && grupoInvalido) {
      return 'Las contraseñas no coinciden.';
    }

    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('passwordPolitica')) {
      return MENSAJE_POLITICA_PASSWORD;
    }

    if (campo.hasError('maxlength')) {
      const limite = campo.getError('maxlength')['requiredLength'] as number;
      return `No puede superar los ${limite} caracteres.`;
    }

    return 'Dato inválido.';
  }
}
