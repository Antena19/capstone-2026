import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ConductoresService } from '../../core/services/conductores.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { Conductor, ConductorConCuentaSolicitud, ConductorSolicitud } from '../../core/models/conductor';
import { EstadoRegistro } from '../../core/models/empresa';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { Icon } from '../../shared/components/icon/icon';
import { Modal } from '../../shared/components/modal/modal';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SearchInput } from '../../shared/components/search-input/search-input';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { ConductorForm } from './conductor-form';

type ModoFormulario = 'crear' | 'editar';

@Component({
  selector: 'app-conductores',
  imports: [
    PageHeader,
    ActionButton,
    SearchInput,
    FilterSelect,
    AppCard,
    StatusBadge,
    Icon,
    Modal,
    ConfirmDialog,
    ConductorForm,
  ],
  templateUrl: './conductores.html',
  styleUrl: './conductores.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConductoresPage {
  private readonly api = inject(ConductoresService);
  private readonly feedback = inject(FeedbackService);

  readonly opcionesEstado: FilterOption[] = [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6];

  readonly conductores = signal<Conductor[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly estadoFiltro = signal('');

  readonly formularioAbierto = signal(false);
  readonly modo = signal<ModoFormulario>('crear');
  readonly conductorEdicion = signal<Conductor | null>(null);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);

  readonly confirmacionAbierta = signal(false);
  readonly conductorEstado = signal<Conductor | null>(null);
  readonly idConductorCambiandoEstado = signal<number | null>(null);

  readonly credenciales = signal<{ email: string; passwordTemporal: string } | null>(null);
  readonly copiado = signal(false);
  readonly avisoCopia = signal<string | null>(null);

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.conductores();
    if (!texto) {
      return lista;
    }

    return lista.filter((conductor) =>
      [conductor.nombre, conductor.rut, conductor.telefono].join(' ').toLowerCase().includes(texto),
    );
  });

  readonly subtitulo = computed(
    () => 'Gestión de conductores habilitados para los servicios de transporte',
  );

  readonly tituloFormulario = computed(() =>
    this.modo() === 'editar' ? 'Editar conductor' : 'Nuevo conductor',
  );

  readonly mensajeConfirmacion = computed(() => {
    const conductor = this.conductorEstado();
    if (!conductor) {
      return '';
    }

    return `¿Desea desactivar al conductor ${conductor.nombre}? No se eliminará el registro; podrá activarlo nuevamente.`;
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const estado = this.estadoFiltro() as EstadoRegistro | '';

    this.api.listar(estado === '' ? null : estado).subscribe({
      next: (lista) => {
        this.conductores.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los conductores.'));
      },
    });
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargar();
  }

  abrirCrear(): void {
    this.modo.set('crear');
    this.conductorEdicion.set(null);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  abrirEditar(conductor: Conductor): void {
    this.modo.set('editar');
    this.conductorEdicion.set(conductor);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);

    this.api.obtenerPorId(conductor.idConductor).subscribe({
      next: (detalle) => this.conductorEdicion.set(detalle),
      error: (err: unknown) => {
        this.errorFormulario.set(
          mensajeErrorHttp(err, 'No fue posible actualizar los datos del conductor.'),
        );
      },
    });
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.formularioAbierto.set(false);
    this.conductorEdicion.set(null);
    this.errorFormulario.set(null);
  }

  guardarCreacion(solicitud: ConductorConCuentaSolicitud): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.api.crearConCuenta(solicitud).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.conductorEdicion.set(null);
        this.credenciales.set({
          email: respuesta.email,
          passwordTemporal: respuesta.passwordTemporal,
        });
        this.copiado.set(false);
        this.avisoCopia.set(null);
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible crear el conductor.'));
      },
    });
  }

  guardar(solicitud: ConductorSolicitud): void {
    if (this.guardando()) {
      return;
    }

    const edicion = this.conductorEdicion();
    if (!edicion) {
      this.errorFormulario.set('No es posible guardar el conductor.');
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.api.editar(edicion.idConductor, solicitud).subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.conductorEdicion.set(null);
        this.feedback.mostrar('Conductor actualizado correctamente.');
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible guardar el conductor.'));
      },
    });
  }

  cerrarCredenciales(): void {
    this.credenciales.set(null);
    this.copiado.set(false);
    this.avisoCopia.set(null);
  }

  async copiarPasswordTemporal(): Promise<void> {
    const password = this.credenciales()?.passwordTemporal;
    if (!password) {
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      this.copiado.set(true);
      this.avisoCopia.set('Contraseña copiada.');
    } catch {
      this.copiado.set(false);
      this.avisoCopia.set('No fue posible copiar. Selecciona la contraseña y cópiala manualmente.');
    }
  }

  pedirDesactivar(conductor: Conductor): void {
    if (this.estaCambiandoEstado(conductor.idConductor)) {
      return;
    }

    this.conductorEstado.set(conductor);
    this.confirmacionAbierta.set(true);
  }

  cancelarDesactivar(): void {
    this.confirmacionAbierta.set(false);
    this.conductorEstado.set(null);
  }

  confirmarDesactivar(): void {
    const conductor = this.conductorEstado();
    if (!conductor || this.estaCambiandoEstado(conductor.idConductor)) {
      return;
    }

    this.confirmacionAbierta.set(false);
    this.conductorEstado.set(null);
    this.cambiarEstado(conductor, 'INACTIVO', 'Conductor desactivado correctamente.');
  }

  activar(conductor: Conductor): void {
    this.cambiarEstado(conductor, 'ACTIVO', 'Conductor activado correctamente.');
  }

  estaCambiandoEstado(idConductor: number): boolean {
    return this.idConductorCambiandoEstado() === idConductor;
  }

  private cambiarEstado(conductor: Conductor, estado: EstadoRegistro, mensaje: string): void {
    if (this.estaCambiandoEstado(conductor.idConductor)) {
      return;
    }

    this.idConductorCambiandoEstado.set(conductor.idConductor);
    this.api.cambiarEstado(conductor.idConductor, { estado }).subscribe({
      next: () => {
        this.idConductorCambiandoEstado.set(null);
        this.feedback.mostrar(mensaje);
        this.cargar();
      },
      error: (err: unknown) => {
        this.idConductorCambiandoEstado.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cambiar el estado del conductor.'));
      },
    });
  }
}
