import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Empresa } from '../../core/models/empresa';
import { Pasajero, PasajeroConCuentaSolicitud, PasajeroSolicitud } from '../../core/models/pasajero';
import { normalizarRut } from '../../core/utils/rut';
import { rutChilenoValidator } from '../../core/validators/rut.validator';
import { ActionButton } from '../../shared/components/action-button/action-button';

@Component({
  selector: 'app-pasajero-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './pasajero-form.html',
  styleUrl: './pasajero-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasajeroForm {
  readonly pasajero = input<Pasajero | null>(null);
  readonly empresas = input<Empresa[]>([]);
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly catalogoListo = input(false);
  readonly error = input<string | null>(null);
  readonly creado = output<PasajeroConCuentaSolicitud>();
  readonly guardado = output<PasajeroSolicitud>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    idEmpresa: ['', Validators.required],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    rut: ['', [Validators.required, Validators.maxLength(12), rutChilenoValidator()]],
    telefono: ['', [Validators.required, Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
  });

  readonly esEdicion = computed(() => this.pasajero() !== null);

  readonly empresasDisponibles = computed(() => {
    const catalogo = this.empresas();
    const actual = this.pasajero();
    const activas = catalogo.filter((empresa) => empresa.estado === 'ACTIVO');

    if (!actual) {
      return activas;
    }

    const actualEnCatalogo = catalogo.find((empresa) => empresa.idEmpresa === actual.idEmpresa);
    if (!actualEnCatalogo || actualEnCatalogo.estado === 'ACTIVO') {
      return activas;
    }

    return [actualEnCatalogo, ...activas];
  });

  readonly sinEmpresas = computed(
    () => this.catalogoListo() && this.empresasDisponibles().length === 0,
  );

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }

      const actual = this.pasajero();
      if (actual) {
        this.form.reset({
          idEmpresa: String(actual.idEmpresa),
          nombre: actual.nombre,
          rut: actual.rut,
          telefono: actual.telefono,
          email: actual.email ?? '',
          direccion: actual.direccion,
        });
        return;
      }

      this.form.reset({
        idEmpresa: '',
        nombre: '',
        rut: '',
        telefono: '',
        email: '',
        direccion: '',
      });
    });
  }

  etiquetaEmpresa(empresa: Empresa): string {
    return `${empresa.razonSocial} · ${empresa.rut}`;
  }

  enviar(): void {
    if (this.guardando() || !this.catalogoListo()) {
      return;
    }

    const valores = this.form.getRawValue();
    const rutNormalizado = normalizarRut(valores.rut);
    const idEmpresa = Number(valores.idEmpresa);
    const email = valores.email.trim().toLowerCase() || null;

    this.form.patchValue({
      idEmpresa: valores.idEmpresa,
      nombre: valores.nombre.trim(),
      rut: rutNormalizado ?? valores.rut.trim(),
      telefono: valores.telefono.trim(),
      email: email ?? '',
      direccion: valores.direccion.trim(),
    });

    if (this.form.invalid || !Number.isInteger(idEmpresa) || idEmpresa < 1) {
      this.form.markAllAsTouched();
      return;
    }

    const base = {
      idEmpresa,
      nombre: valores.nombre.trim(),
      rut: rutNormalizado ?? valores.rut.trim(),
      telefono: valores.telefono.trim(),
      email,
      direccion: valores.direccion.trim(),
    };

    if (this.esEdicion()) {
      this.guardado.emit({
        ...base,
        idUsuario: this.pasajero()?.idUsuario ?? null,
      });
      return;
    }

    this.creado.emit(base);
  }

  normalizarRutCampo(): void {
    const actual = this.form.controls.rut.value;
    const normalizado = normalizarRut(actual);
    if (normalizado && normalizado !== actual) {
      this.form.controls.rut.setValue(normalizado);
    }
  }

  mensajeCampo(
    control: 'idEmpresa' | 'nombre' | 'rut' | 'telefono' | 'email' | 'direccion',
  ): string | null {
    const campo = this.form.controls[control];
    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('rut')) {
      return 'Ingresa un RUT válido.';
    }

    if (campo.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (campo.hasError('maxlength')) {
      const limite = campo.getError('maxlength')['requiredLength'] as number;
      return `No puede superar los ${limite} caracteres.`;
    }

    return 'Dato inválido.';
  }
}
