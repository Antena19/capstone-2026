import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  CrearAdministradorSolicitud,
  EditarAdministradorSolicitud,
  Usuario,
} from '../../core/models/usuario';
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
    const password = grupo.get('password')?.value;
    const confirmacion = grupo.get('passwordConfirm')?.value;
    if (!password && !confirmacion) {
      return null;
    }

    return password === confirmacion ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-administrador-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './administrador-form.html',
  styleUrl: './administrador-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministradorForm {
  readonly administrador = input<Usuario | null>(null);
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly creado = output<CrearAdministradorSolicitud>();
  readonly guardado = output<EditarAdministradorSolicitud>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      telefono: ['', [Validators.maxLength(20)]],
      password: [''],
      passwordConfirm: [''],
    },
    { validators: [contrasenasCoinciden()] },
  );

  readonly esEdicion = computed(() => this.administrador() !== null);

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }

      const actual = this.administrador();
      if (actual) {
        this.form.controls.password.clearValidators();
        this.form.controls.passwordConfirm.clearValidators();
        this.form.setValidators(null);
        this.form.reset({
          email: actual.email,
          telefono: actual.telefono ?? '',
          password: '',
          passwordConfirm: '',
        });
      } else {
        this.form.controls.password.setValidators([
          Validators.required,
          Validators.maxLength(100),
          politicaPassword(),
        ]);
        this.form.controls.passwordConfirm.setValidators([Validators.required]);
        this.form.setValidators(contrasenasCoinciden());
        this.form.reset({
          email: '',
          telefono: '',
          password: '',
          passwordConfirm: '',
        });
      }

      this.form.controls.password.updateValueAndValidity({ emitEvent: false });
      this.form.controls.passwordConfirm.updateValueAndValidity({ emitEvent: false });
      this.form.updateValueAndValidity({ emitEvent: false });
    });
  }

  enviar(): void {
    if (this.guardando()) {
      return;
    }

    const valores = this.form.getRawValue();
    this.form.patchValue({
      email: valores.email.trim(),
      telefono: valores.telefono.trim(),
    });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const datos = this.form.getRawValue();
    const telefono = datos.telefono.trim() || null;
    const email = datos.email.trim();

    if (this.esEdicion()) {
      this.guardado.emit({ email, telefono });
      return;
    }

    this.creado.emit({
      email,
      telefono,
      password: datos.password,
    });
  }

  mensajeCampo(control: 'email' | 'telefono' | 'password' | 'passwordConfirm'): string | null {
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

    if (campo.hasError('email')) {
      return 'El correo electrónico no es válido.';
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
