import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { CambiarPasswordSolicitud } from '../../core/models/autenticacion';
import { ActionButton } from '../../shared/components/action-button/action-button';

function politicaPassword(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '');
    if (!valor) {
      return null;
    }

    if (valor.length < 8 || valor.length > 100) {
      return { passwordPolitica: true };
    }

    const tieneLetra = /[A-Za-z]/.test(valor);
    const tieneNumero = /\d/.test(valor);
    return tieneLetra && tieneNumero ? null : { passwordPolitica: true };
  };
}

function contrasenasCoinciden(): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const password = grupo.get('passwordNueva')?.value;
    const confirmacion = grupo.get('passwordConfirm')?.value;
    if (!password && !confirmacion) {
      return null;
    }

    return password === confirmacion ? null : { passwordMismatch: true };
  };
}

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
      return 'La contraseña debe tener entre 8 y 100 caracteres, e incluir al menos una letra y un número.';
    }

    if (campo.hasError('maxlength')) {
      const limite = campo.getError('maxlength')['requiredLength'] as number;
      return `No puede superar los ${limite} caracteres.`;
    }

    return 'Dato inválido.';
  }
}
