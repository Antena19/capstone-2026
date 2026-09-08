import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EmpresasService } from '../../core/services/empresas.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { Empresa, EmpresaSolicitud, EstadoRegistro } from '../../core/models/empresa';
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
import { EmpresaForm } from './empresa-form';

type ModoFormulario = 'crear' | 'editar';

@Component({
  selector: 'app-empresas',
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
    EmpresaForm,
  ],
  templateUrl: './empresas.html',
  styleUrl: './empresas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpresasPage {
  private readonly api = inject(EmpresasService);
  private readonly feedback = inject(FeedbackService);

  readonly opcionesEstado: FilterOption[] = [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6];

  readonly empresas = signal<Empresa[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly estadoFiltro = signal('');

  readonly formularioAbierto = signal(false);
  readonly modo = signal<ModoFormulario>('crear');
  readonly empresaEdicion = signal<Empresa | null>(null);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);

  readonly confirmacionAbierta = signal(false);
  readonly empresaEstado = signal<Empresa | null>(null);
  readonly idEmpresaCambiandoEstado = signal<number | null>(null);

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.empresas();
    if (!texto) {
      return lista;
    }

    return lista.filter((empresa) =>
      [empresa.razonSocial, empresa.rut, empresa.nombreContacto, empresa.emailContacto]
        .join(' ')
        .toLowerCase()
        .includes(texto),
    );
  });

  readonly subtitulo = computed(
    () => 'Gestión de empresas que utilizan los servicios de transporte',
  );

  readonly tituloFormulario = computed(() =>
    this.modo() === 'editar' ? 'Editar empresa' : 'Nueva empresa',
  );

  readonly mensajeConfirmacion = computed(() => {
    const empresa = this.empresaEstado();
    if (!empresa) {
      return '';
    }

    return `¿Desea desactivar la empresa ${empresa.razonSocial}? No se eliminará el registro; podrá activarla nuevamente.`;
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
        this.empresas.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar las empresas.'));
      },
    });
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargar();
  }

  abrirCrear(): void {
    this.modo.set('crear');
    this.empresaEdicion.set(null);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  abrirEditar(empresa: Empresa): void {
    this.modo.set('editar');
    this.empresaEdicion.set(empresa);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);

    this.api.obtenerPorId(empresa.idEmpresa).subscribe({
      next: (detalle) => this.empresaEdicion.set(detalle),
      error: (err: unknown) => {
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible actualizar los datos de la empresa.'));
      },
    });
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.formularioAbierto.set(false);
    this.empresaEdicion.set(null);
    this.errorFormulario.set(null);
  }

  guardar(solicitud: EmpresaSolicitud): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const esEdicion = this.modo() === 'editar';
    const edicion = this.empresaEdicion();
    const peticion =
      esEdicion && edicion
        ? this.api.editar(edicion.idEmpresa, solicitud)
        : this.api.crear(solicitud);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.empresaEdicion.set(null);
        this.feedback.mostrar(
          esEdicion ? 'Empresa actualizada correctamente.' : 'Empresa creada correctamente.',
        );
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible guardar la empresa.'));
      },
    });
  }

  pedirDesactivar(empresa: Empresa): void {
    if (this.estaCambiandoEstado(empresa.idEmpresa)) {
      return;
    }

    this.empresaEstado.set(empresa);
    this.confirmacionAbierta.set(true);
  }

  cancelarDesactivar(): void {
    this.confirmacionAbierta.set(false);
    this.empresaEstado.set(null);
  }

  confirmarDesactivar(): void {
    const empresa = this.empresaEstado();
    if (!empresa || this.estaCambiandoEstado(empresa.idEmpresa)) {
      return;
    }

    this.confirmacionAbierta.set(false);
    this.empresaEstado.set(null);
    this.cambiarEstado(empresa, 'INACTIVO', 'Empresa desactivada correctamente.');
  }

  activar(empresa: Empresa): void {
    this.cambiarEstado(empresa, 'ACTIVO', 'Empresa activada correctamente.');
  }

  estaCambiandoEstado(idEmpresa: number): boolean {
    return this.idEmpresaCambiandoEstado() === idEmpresa;
  }

  private cambiarEstado(empresa: Empresa, estado: EstadoRegistro, mensaje: string): void {
    if (this.estaCambiandoEstado(empresa.idEmpresa)) {
      return;
    }

    this.idEmpresaCambiandoEstado.set(empresa.idEmpresa);
    this.api.cambiarEstado(empresa.idEmpresa, { estado }).subscribe({
      next: () => {
        this.idEmpresaCambiandoEstado.set(null);
        this.feedback.mostrar(mensaje);
        this.cargar();
      },
      error: (err: unknown) => {
        this.idEmpresaCambiandoEstado.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cambiar el estado de la empresa.'));
      },
    });
  }
}
