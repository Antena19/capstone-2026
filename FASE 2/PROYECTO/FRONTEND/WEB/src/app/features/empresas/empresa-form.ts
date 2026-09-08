import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Empresa, EmpresaSolicitud } from '../../core/models/empresa';
import { normalizarRut } from '../../core/utils/rut';
import { rutChilenoValidator } from '../../core/validators/rut.validator';
import { ActionButton } from '../../shared/components/action-button/action-button';

@Component({
  selector: 'app-empresa-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './empresa-form.html',
  styleUrl: './empresa-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpresaForm {
  readonly empresa = input<Empresa | null>(null);
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardado = output<EmpresaSolicitud>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    rut: ['', [Validators.required, Validators.maxLength(12), rutChilenoValidator()]],
    razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
    telefono: ['', [Validators.required, Validators.maxLength(20)]],
    emailContacto: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(150)],
    ],
    nombreContacto: ['', [Validators.required, Validators.maxLength(100)]],
  });

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }

      const actual = this.empresa();
      if (actual) {
        this.form.reset({
          rut: actual.rut,
          razonSocial: actual.razonSocial,
          direccion: actual.direccion,
          telefono: actual.telefono,
          emailContacto: actual.emailContacto,
          nombreContacto: actual.nombreContacto,
        });
        return;
      }

      this.form.reset({
        rut: '',
        razonSocial: '',
        direccion: '',
        telefono: '',
        emailContacto: '',
        nombreContacto: '',
      });
    });
  }

  readonly esEdicion = computed(() => this.empresa() !== null);

  enviar(): void {
    if (this.guardando()) {
      return;
    }

    const valores = this.form.getRawValue();
    const rutNormalizado = normalizarRut(valores.rut);
    const solicitud: EmpresaSolicitud = {
      rut: rutNormalizado ?? valores.rut.trim(),
      razonSocial: valores.razonSocial.trim(),
      direccion: valores.direccion.trim(),
      telefono: valores.telefono.trim(),
      emailContacto: valores.emailContacto.trim(),
      nombreContacto: valores.nombreContacto.trim(),
    };
    this.form.patchValue(solicitud);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardado.emit(solicitud);
  }

  normalizarRutCampo(): void {
    const actual = this.form.controls.rut.value;
    const normalizado = normalizarRut(actual);
    if (normalizado && normalizado !== actual) {
      this.form.controls.rut.setValue(normalizado);
    }
  }

  mensajeCampo(control: 'rut' | 'razonSocial' | 'direccion' | 'telefono' | 'emailContacto' | 'nombreContacto'): string | null {
    const campo = this.form.controls[control];
    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('email')) {
      return 'El correo de contacto no es válido.';
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
