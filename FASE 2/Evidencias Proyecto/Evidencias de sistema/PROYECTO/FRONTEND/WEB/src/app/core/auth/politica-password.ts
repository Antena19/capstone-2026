import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MENSAJE_POLITICA_PASSWORD =
  'La contraseña debe tener entre 8 y 100 caracteres, e incluir al menos una letra y un número.';

export function politicaPassword(): ValidatorFn {
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

export function contrasenasCoinciden(): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const password = grupo.get('passwordNueva')?.value;
    const confirmacion = grupo.get('passwordConfirm')?.value;
    if (!password && !confirmacion) {
      return null;
    }

    return password === confirmacion ? null : { passwordMismatch: true };
  };
}
