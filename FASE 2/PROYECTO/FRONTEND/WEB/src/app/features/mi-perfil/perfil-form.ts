import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EditarAdministradorSolicitud, Usuario } from '../../core/models/usuario';
import { ActionButton } from '../../shared/components/action-button/action-button';

@Component({
  selector: 'app-perfil-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './perfil-form.html',
  styleUrl: './perfil-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilForm {
  readonly perfil = input<Usuario | null>(null);
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardado = output<EditarAdministradorSolicitud>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    telefono: ['', [Validators.maxLength(20)]],
  });

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }

      const actual = this.perfil();
      this.form.reset({
        email: actual?.email ?? '',
        telefono: actual?.telefono ?? '',
      });
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
    this.guardado.emit({
      email: datos.email.trim(),
      telefono: datos.telefono.trim() || null,
    });
  }

  mensajeCampo(control: 'email' | 'telefono'): string | null {
    const campo = this.form.controls[control];
    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('email')) {
      return 'El correo electrónico no es válido.';
    }

    if (campo.hasError('maxlength')) {
      const limite = campo.getError('maxlength')['requiredLength'] as number;
      return `No puede superar los ${limite} caracteres.`;
    }

    return 'Dato inválido.';
  }
}
