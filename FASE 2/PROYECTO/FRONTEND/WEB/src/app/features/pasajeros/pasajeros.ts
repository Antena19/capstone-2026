import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { EmpresasService } from '../../core/services/empresas.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { Empresa, EstadoRegistro } from '../../core/models/empresa';
import { Pasajero, PasajeroSolicitud } from '../../core/models/pasajero';
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
import { PasajeroForm } from './pasajero-form';

type ModoFormulario = 'crear' | 'editar';

@Component({
  selector: 'app-pasajeros',
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
    PasajeroForm,
  ],
  templateUrl: './pasajeros.html',
  styleUrl: './pasajeros.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasajerosPage {
  private readonly api = inject(PasajerosService);
  private readonly empresasApi = inject(EmpresasService);
  private readonly feedback = inject(FeedbackService);

  readonly opcionesEstado: FilterOption[] = [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6];

  readonly pasajeros = signal<Pasajero[]>([]);
  readonly empresas = signal<Empresa[]>([]);
  readonly catalogoCargado = signal(false);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly estadoFiltro = signal('');
  readonly empresaFiltro = signal('');

  readonly formularioAbierto = signal(false);
  readonly modo = signal<ModoFormulario>('crear');
  readonly pasajeroEdicion = signal<Pasajero | null>(null);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);

  readonly confirmacionAbierta = signal(false);
  readonly pasajeroEstado = signal<Pasajero | null>(null);
  readonly idPasajeroCambiandoEstado = signal<number | null>(null);

  readonly opcionesEmpresa = computed<FilterOption[]>(() =>
    this.empresas().map((empresa) => ({
      value: String(empresa.idEmpresa),
      label: empresa.razonSocial,
    })),
  );

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.pasajeros();
    if (!texto) {
      return lista;
    }

    return lista.filter((pasajero) => {
      const empresa = this.nombreEmpresa(pasajero.idEmpresa);
      return [pasajero.nombre, pasajero.rut, pasajero.telefono, empresa]
        .join(' ')
        .toLowerCase()
        .includes(texto);
    });
  });

  readonly subtitulo = computed(
    () => 'Gestión de pasajeros asociados a las empresas clientes',
  );

  readonly tituloFormulario = computed(() =>
    this.modo() === 'editar' ? 'Editar pasajero' : 'Nuevo pasajero',
  );

  readonly mensajeConfirmacion = computed(() => {
    const pasajero = this.pasajeroEstado();
    if (!pasajero) {
      return '';
    }

    return `¿Desea desactivar al pasajero ${pasajero.nombre}? No se eliminará el registro; podrá activarlo nuevamente.`;
  });

  constructor() {
    this.cargar();
  }

  nombreEmpresa(idEmpresa: number): string {
    return this.empresas().find((empresa) => empresa.idEmpresa === idEmpresa)?.razonSocial
      ?? `Empresa ${idEmpresa}`;
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const estado = this.estadoFiltro() as EstadoRegistro | '';
    const idEmpresa = Number(this.empresaFiltro());

    const empresas$ = this.catalogoCargado()
      ? of(this.empresas())
      : this.empresasApi.listar();

    forkJoin({
      empresas: empresas$,
      pasajeros: this.api.listar(
        estado === '' ? null : estado,
        Number.isInteger(idEmpresa) && idEmpresa > 0 ? idEmpresa : null,
      ),
    }).subscribe({
      next: ({ empresas, pasajeros }) => {
        this.empresas.set(empresas);
        this.catalogoCargado.set(true);
        this.pasajeros.set(pasajeros);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los pasajeros.'));
      },
    });
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargar();
  }

  actualizarEmpresaFiltro(valor: string): void {
    this.empresaFiltro.set(valor);
    this.cargar();
  }

  abrirCrear(): void {
    this.modo.set('crear');
    this.pasajeroEdicion.set(null);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  abrirEditar(pasajero: Pasajero): void {
    this.modo.set('editar');
    this.pasajeroEdicion.set(pasajero);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);

    this.api.obtenerPorId(pasajero.idPasajero).subscribe({
      next: (detalle) => this.pasajeroEdicion.set(detalle),
      error: (err: unknown) => {
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible actualizar los datos del pasajero.'));
      },
    });
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.formularioAbierto.set(false);
    this.pasajeroEdicion.set(null);
    this.errorFormulario.set(null);
  }

  guardar(solicitud: PasajeroSolicitud): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const esEdicion = this.modo() === 'editar';
    const edicion = this.pasajeroEdicion();
    const peticion =
      esEdicion && edicion
        ? this.api.editar(edicion.idPasajero, solicitud)
        : this.api.crear(solicitud);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.pasajeroEdicion.set(null);
        this.feedback.mostrar(
          esEdicion ? 'Pasajero actualizado correctamente.' : 'Pasajero creado correctamente.',
        );
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible guardar el pasajero.'));
      },
    });
  }

  pedirDesactivar(pasajero: Pasajero): void {
    if (this.estaCambiandoEstado(pasajero.idPasajero)) {
      return;
    }

    this.pasajeroEstado.set(pasajero);
    this.confirmacionAbierta.set(true);
  }

  cancelarDesactivar(): void {
    this.confirmacionAbierta.set(false);
    this.pasajeroEstado.set(null);
  }

  confirmarDesactivar(): void {
    const pasajero = this.pasajeroEstado();
    if (!pasajero || this.estaCambiandoEstado(pasajero.idPasajero)) {
      return;
    }

    this.confirmacionAbierta.set(false);
    this.pasajeroEstado.set(null);
    this.cambiarEstado(pasajero, 'INACTIVO', 'Pasajero desactivado correctamente.');
  }

  activar(pasajero: Pasajero): void {
    this.cambiarEstado(pasajero, 'ACTIVO', 'Pasajero activado correctamente.');
  }

  estaCambiandoEstado(idPasajero: number): boolean {
    return this.idPasajeroCambiandoEstado() === idPasajero;
  }

  private cambiarEstado(pasajero: Pasajero, estado: EstadoRegistro, mensaje: string): void {
    if (this.estaCambiandoEstado(pasajero.idPasajero)) {
      return;
    }

    this.idPasajeroCambiandoEstado.set(pasajero.idPasajero);
    this.api.cambiarEstado(pasajero.idPasajero, { estado }).subscribe({
      next: () => {
        this.idPasajeroCambiandoEstado.set(null);
        this.feedback.mostrar(mensaje);
        this.cargar();
      },
      error: (err: unknown) => {
        this.idPasajeroCambiandoEstado.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cambiar el estado del pasajero.'));
      },
    });
  }
}
