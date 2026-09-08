import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Vehiculo, VehiculoSolicitud } from '../../core/models/vehiculo';
import { ActionButton } from '../../shared/components/action-button/action-button';

function capacidadValida(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === '') {
      return { required: true };
    }

    const numero = Number(valor);
    if (!Number.isFinite(numero) || !Number.isInteger(numero)) {
      return { entero: true };
    }

    if (numero < 1) {
      return { min: { min: 1, actual: numero } };
    }

    return null;
  };
}

@Component({
  selector: 'app-vehiculo-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './vehiculo-form.html',
  styleUrl: './vehiculo-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiculoForm {
  readonly vehiculo = input<Vehiculo | null>(null);
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardado = output<VehiculoSolicitud>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    patente: ['', [Validators.required, Validators.maxLength(10)]],
    tipo: ['', [Validators.required, Validators.maxLength(50)]],
    marca: ['', [Validators.required, Validators.maxLength(50)]],
    modelo: ['', [Validators.required, Validators.maxLength(50)]],
    capacidad: [null as number | null, [capacidadValida()]],
  });

  readonly esEdicion = computed(() => this.vehiculo() !== null);

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }

      const actual = this.vehiculo();
      if (actual) {
        this.form.reset({
          patente: actual.patente,
          tipo: actual.tipo,
          marca: actual.marca,
          modelo: actual.modelo,
          capacidad: actual.capacidad,
        });
        return;
      }

      this.form.reset({
        patente: '',
        tipo: '',
        marca: '',
        modelo: '',
        capacidad: null,
      });
    });
  }

  enviar(): void {
    if (this.guardando()) {
      return;
    }

    const valores = this.form.getRawValue();
    const patente = valores.patente.trim().toUpperCase();
    const tipo = valores.tipo.trim();
    const marca = valores.marca.trim();
    const modelo = valores.modelo.trim();
    const capacidad = Number(valores.capacidad);

    this.form.patchValue({
      patente,
      tipo,
      marca,
      modelo,
      capacidad: Number.isFinite(capacidad) ? capacidad : null,
    });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardado.emit({
      patente,
      tipo,
      marca,
      modelo,
      capacidad,
    });
  }

  normalizarPatenteCampo(): void {
    const actual = this.form.controls.patente.value;
    const normalizado = actual.trim().toUpperCase();
    if (normalizado !== actual) {
      this.form.controls.patente.setValue(normalizado);
    }
  }

  mensajeCampo(control: 'patente' | 'tipo' | 'marca' | 'modelo' | 'capacidad'): string | null {
    const campo = this.form.controls[control];
    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('entero')) {
      return 'La capacidad debe ser un número entero.';
    }

    if (campo.hasError('min')) {
      return 'La capacidad debe ser mayor que cero.';
    }

    if (campo.hasError('maxlength')) {
      const limite = campo.getError('maxlength')['requiredLength'] as number;
      return `No puede superar los ${limite} caracteres.`;
    }

    return 'Dato inválido.';
  }
}
