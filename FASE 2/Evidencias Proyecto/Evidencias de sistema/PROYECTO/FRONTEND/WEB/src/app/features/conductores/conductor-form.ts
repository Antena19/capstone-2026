import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Conductor, ConductorConCuentaSolicitud, ConductorSolicitud } from '../../core/models/conductor';
import { normalizarRut } from '../../core/utils/rut';
import { rutChilenoValidator } from '../../core/validators/rut.validator';
import { ActionButton } from '../../shared/components/action-button/action-button';

@Component({
  selector: 'app-conductor-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './conductor-form.html',
  styleUrl: './conductor-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConductorForm {
  readonly conductor = input<Conductor | null>(null);
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly creado = output<ConductorConCuentaSolicitud>();
  readonly guardado = output<ConductorSolicitud>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    rut: ['', [Validators.required, Validators.maxLength(12), rutChilenoValidator()]],
    telefono: ['', [Validators.required, Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
  });

  readonly esEdicion = computed(() => this.conductor() !== null);

  readonly puedeGuardar = computed(() => {
    if (this.esEdicion()) {
      return this.conductor() !== null && this.conductor()!.idUsuario > 0;
    }

    return true;
  });

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }

      const actual = this.conductor();
      if (actual) {
        this.form.reset({
          nombre: actual.nombre,
          rut: actual.rut,
          telefono: actual.telefono,
          email: '',
        });
        this.form.controls.email.clearValidators();
        this.form.controls.email.updateValueAndValidity({ emitEvent: false });
        return;
      }

      this.form.controls.email.setValidators([
        Validators.required,
        Validators.email,
        Validators.maxLength(150),
      ]);
      this.form.reset({
        nombre: '',
        rut: '',
        telefono: '',
        email: '',
      });
    });
  }

  enviar(): void {
    if (this.guardando()) {
      return;
    }

    const valores = this.form.getRawValue();
    const rutNormalizado = normalizarRut(valores.rut);
    const nombre = valores.nombre.trim();
    const telefono = valores.telefono.trim();
    const rut = rutNormalizado ?? valores.rut.trim();
    const email = valores.email.trim().toLowerCase();

    this.form.patchValue({
      nombre,
      rut,
      telefono,
      email,
    });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.esEdicion()) {
      this.creado.emit({ nombre, rut, telefono, email });
      return;
    }

    const actual = this.conductor();
    if (!actual || actual.idUsuario < 1) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardado.emit({
      idUsuario: actual.idUsuario,
      nombre,
      rut,
      telefono,
    });
  }

  normalizarRutCampo(): void {
    const actual = this.form.controls.rut.value;
    const normalizado = normalizarRut(actual);
    if (normalizado && normalizado !== actual) {
      this.form.controls.rut.setValue(normalizado);
    }
  }

  mensajeCampo(control: 'nombre' | 'rut' | 'telefono' | 'email'): string | null {
    const campo = this.form.controls[control];
    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('email')) {
      return 'Ingresa un correo electrónico válido.';
    }

    if (campo.hasError('rut')) {
      return 'Ingresa un RUT válido.';
    }

    if (campo.hasError('maxlength')) {
      const limite = campo.getError('maxlength')['requiredLength'] as number;
      return `No puede superar los ${limite} caracteres.`;
    }

    return 'Dato inválido.';
  }
}
