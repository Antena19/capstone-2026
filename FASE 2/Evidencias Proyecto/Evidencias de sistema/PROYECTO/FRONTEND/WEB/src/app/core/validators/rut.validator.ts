import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { esRutChilenoValido } from '../utils/rut';

export function rutChilenoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '').trim();
    if (!valor) {
      return null;
    }

    return esRutChilenoValido(valor) ? null : { rut: true };
  };
}
