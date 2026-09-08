import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FeedbackService } from '../../core/services/feedback.service';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { EstadoRegistro } from '../../core/models/empresa';
import { Vehiculo, VehiculoSolicitud } from '../../core/models/vehiculo';
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
import { VehiculoForm } from './vehiculo-form';

type ModoFormulario = 'crear' | 'editar';

@Component({
  selector: 'app-vehiculos',
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
    VehiculoForm,
  ],
  templateUrl: './vehiculos.html',
  styleUrl: './vehiculos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiculosPage {
  private readonly api = inject(VehiculosService);
  private readonly feedback = inject(FeedbackService);

  readonly opcionesEstado: FilterOption[] = [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6];

  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly estadoFiltro = signal('');

  readonly formularioAbierto = signal(false);
  readonly modo = signal<ModoFormulario>('crear');
  readonly vehiculoEdicion = signal<Vehiculo | null>(null);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);

  readonly confirmacionAbierta = signal(false);
  readonly vehiculoEstado = signal<Vehiculo | null>(null);
  readonly idVehiculoCambiandoEstado = signal<number | null>(null);

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.vehiculos();
    if (!texto) {
      return lista;
    }

    return lista.filter((vehiculo) =>
      [vehiculo.patente, vehiculo.tipo, vehiculo.marca, vehiculo.modelo]
        .join(' ')
        .toLowerCase()
        .includes(texto),
    );
  });

  readonly subtitulo = computed(
    () => 'Gestión de vehículos disponibles para los servicios de transporte',
  );

  readonly tituloFormulario = computed(() =>
    this.modo() === 'editar' ? 'Editar vehículo' : 'Nuevo vehículo',
  );

  readonly mensajeConfirmacion = computed(() => {
    const vehiculo = this.vehiculoEstado();
    if (!vehiculo) {
      return '';
    }

    return `¿Desea desactivar el vehículo ${vehiculo.patente}? No se eliminará el registro; podrá activarlo nuevamente.`;
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
        this.vehiculos.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los vehículos.'));
      },
    });
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargar();
  }

  abrirCrear(): void {
    this.modo.set('crear');
    this.vehiculoEdicion.set(null);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  abrirEditar(vehiculo: Vehiculo): void {
    this.modo.set('editar');
    this.vehiculoEdicion.set(vehiculo);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);

    this.api.obtenerPorId(vehiculo.idVehiculo).subscribe({
      next: (detalle) => this.vehiculoEdicion.set(detalle),
      error: (err: unknown) => {
        this.errorFormulario.set(
          mensajeErrorHttp(err, 'No fue posible actualizar los datos del vehículo.'),
        );
      },
    });
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.formularioAbierto.set(false);
    this.vehiculoEdicion.set(null);
    this.errorFormulario.set(null);
  }

  guardar(solicitud: VehiculoSolicitud): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const esEdicion = this.modo() === 'editar';
    const edicion = this.vehiculoEdicion();
    const peticion =
      esEdicion && edicion
        ? this.api.editar(edicion.idVehiculo, solicitud)
        : this.api.crear(solicitud);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.vehiculoEdicion.set(null);
        this.feedback.mostrar(
          esEdicion ? 'Vehículo actualizado correctamente.' : 'Vehículo creado correctamente.',
        );
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible guardar el vehículo.'));
      },
    });
  }

  pedirDesactivar(vehiculo: Vehiculo): void {
    if (this.estaCambiandoEstado(vehiculo.idVehiculo)) {
      return;
    }

    this.vehiculoEstado.set(vehiculo);
    this.confirmacionAbierta.set(true);
  }

  cancelarDesactivar(): void {
    this.confirmacionAbierta.set(false);
    this.vehiculoEstado.set(null);
  }

  confirmarDesactivar(): void {
    const vehiculo = this.vehiculoEstado();
    if (!vehiculo || this.estaCambiandoEstado(vehiculo.idVehiculo)) {
      return;
    }

    this.confirmacionAbierta.set(false);
    this.vehiculoEstado.set(null);
    this.cambiarEstado(vehiculo, 'INACTIVO', 'Vehículo desactivado correctamente.');
  }

  activar(vehiculo: Vehiculo): void {
    this.cambiarEstado(vehiculo, 'ACTIVO', 'Vehículo activado correctamente.');
  }

  estaCambiandoEstado(idVehiculo: number): boolean {
    return this.idVehiculoCambiandoEstado() === idVehiculo;
  }

  private cambiarEstado(vehiculo: Vehiculo, estado: EstadoRegistro, mensaje: string): void {
    if (this.estaCambiandoEstado(vehiculo.idVehiculo)) {
      return;
    }

    this.idVehiculoCambiandoEstado.set(vehiculo.idVehiculo);
    this.api.cambiarEstado(vehiculo.idVehiculo, { estado }).subscribe({
      next: () => {
        this.idVehiculoCambiandoEstado.set(null);
        this.feedback.mostrar(mensaje);
        this.cargar();
      },
      error: (err: unknown) => {
        this.idVehiculoCambiandoEstado.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cambiar el estado del vehículo.'));
      },
    });
  }
}
