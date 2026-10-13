import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Vehiculo, VehiculoSolicitud } from '../../core/models/vehiculo';
import { ActionButton } from '../../shared/components/action-button/action-button';

const TIPOS_CATALOGO = ['Automóvil', 'Van', 'Minibús', 'Bus'] as const;
const TIPO_OTRO = 'otro';

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

  readonly tiposCatalogo = TIPOS_CATALOGO;
  readonly esOtro = signal(false);

  readonly form = this.fb.nonNullable.group({
    patente: ['', [Validators.required, Validators.maxLength(10)]],
    tipoCatalogo: ['', Validators.required],
    tipoPersonalizado: ['', Validators.maxLength(50)],
    marca: ['', [Validators.required, Validators.maxLength(50)]],
    modelo: ['', [Validators.required, Validators.maxLength(50)]],
    capacidad: [null as number | null, [capacidadValida()]],
  });

  readonly esEdicion = computed(() => this.vehiculo() !== null);

  constructor() {
    this.form.controls.tipoCatalogo.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => {
      this.aplicarSeleccionTipo(valor);
    });

    effect(() => {
      if (!this.abierto()) {
        return;
      }

      const actual = this.vehiculo();
      const tipo = clasificarTipo(actual?.tipo ?? '');
      this.form.reset({
        patente: actual?.patente ?? '',
        tipoCatalogo: tipo.catalogo,
        tipoPersonalizado: tipo.personalizado,
        marca: actual?.marca ?? '',
        modelo: actual?.modelo ?? '',
        capacidad: actual?.capacidad ?? null,
      }, { emitEvent: false });
      this.aplicarSeleccionTipo(tipo.catalogo, tipo.personalizado);
    });
  }

  private aplicarSeleccionTipo(valor: string, personalizadoConservado?: string): void {
    const esOtro = valor === TIPO_OTRO;
    const detalle = this.form.controls.tipoPersonalizado;

    if (esOtro) {
      if (personalizadoConservado !== undefined) {
        detalle.setValue(personalizadoConservado, { emitEvent: false });
      }
    } else if (detalle.value !== '') {
      detalle.setValue('', { emitEvent: false });
    }

    this.configurarTipoPersonalizado(esOtro);
    this.esOtro.set(esOtro);
  }

  enviar(): void {
    if (this.guardando()) {
      return;
    }

    const valores = this.form.getRawValue();
    const patente = valores.patente.trim().toUpperCase();
    const esOtro = valores.tipoCatalogo === TIPO_OTRO;
    const tipo = (esOtro ? valores.tipoPersonalizado : valores.tipoCatalogo).trim();
    const marca = valores.marca.trim();
    const modelo = valores.modelo.trim();
    const capacidad = Number(valores.capacidad);

    this.form.patchValue({
      patente,
      tipoPersonalizado: esOtro ? tipo : '',
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

  private configurarTipoPersonalizado(esOtro: boolean): void {
    const detalle = this.form.controls.tipoPersonalizado;
    detalle.setValidators(esOtro
      ? [Validators.required, Validators.maxLength(50)]
      : [Validators.maxLength(50)]);
    detalle.updateValueAndValidity();
  }

  mensajeCampo(
    control: 'patente' | 'tipoCatalogo' | 'tipoPersonalizado' | 'marca' | 'modelo' | 'capacidad',
  ): string | null {
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

function clasificarTipo(tipo: string): { catalogo: string; personalizado: string } {
  if ((TIPOS_CATALOGO as readonly string[]).includes(tipo)) {
    return { catalogo: tipo, personalizado: '' };
  }

  if (tipo.trim()) {
    return { catalogo: TIPO_OTRO, personalizado: tipo };
  }

  return { catalogo: '', personalizado: '' };
}
