import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Empresa } from '../../core/models/empresa';
import { CrearPlanificacionSolicitud, Planificacion } from '../../core/models/planificacion';
import { ActionButton } from '../../shared/components/action-button/action-button';

@Component({
  selector: 'app-planificacion-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './planificacion-form.html',
  styleUrl: './planificacion-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanificacionForm {
  readonly planificacion = input<Planificacion | null>(null);
  readonly empresas = input<Empresa[]>([]);
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardado = output<CrearPlanificacionSolicitud>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly periodoMinimo = periodoDelMesActual();

  readonly form = this.fb.nonNullable.group({
    idEmpresa: ['', Validators.required],
    periodo: ['', [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/), this.validarPeriodoMinimo.bind(this)]],
  });

  readonly esEdicion = computed(() => this.planificacion() !== null);

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }

      const actual = this.planificacion();
      if (actual) {
        this.form.reset({
          idEmpresa: String(actual.idEmpresa),
          periodo: actual.periodo,
        });
        return;
      }

      this.form.reset({
        idEmpresa: '',
        periodo: '',
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

    const valores = this.form.getRawValue();
    if (valores.periodo < this.periodoMinimo) {
      this.form.controls.periodo.setErrors({ periodoAnterior: true });
      this.form.controls.periodo.markAsTouched();
      return;
    }
    this.guardado.emit({
      idEmpresa: Number(valores.idEmpresa),
      periodo: valores.periodo,
    });
  }

  mensajeCampo(control: 'idEmpresa' | 'periodo'): string | null {
    const campo = this.form.controls[control];
    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('periodoAnterior')) {
      return 'El período no puede ser anterior al mes actual.';
    }

    if (campo.hasError('pattern')) {
      return 'El período debe tener el formato YYYY-MM.';
    }

    return 'Dato inválido.';
  }

  private validarPeriodoMinimo(control: AbstractControl): { periodoAnterior: true } | null {
    const valor = String(control.value ?? '');
    if (!valor) {
      return null;
    }

    return valor < this.periodoMinimo ? { periodoAnterior: true } : null;
  }
}

function periodoDelMesActual(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}`;
}
