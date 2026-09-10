import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EmpresasService } from '../../core/services/empresas.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { PlanificacionesService } from '../../core/services/planificaciones.service';
import { Empresa } from '../../core/models/empresa';
import {
  CambiarEstadoPlanificacionSolicitud,
  CrearPlanificacionSolicitud,
  EstadoPlanificacion,
  Planificacion,
} from '../../core/models/planificacion';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { Modal } from '../../shared/components/modal/modal';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge, BadgeTone } from '../../shared/components/status-badge/status-badge';
import { PlanificacionForm } from './planificacion-form';

type ModoFormulario = 'crear' | 'editar';
type DestinoEstado = CambiarEstadoPlanificacionSolicitud['estado'];

@Component({
  selector: 'app-planificaciones',
  imports: [
    DatePipe,
    PageHeader,
    ActionButton,
    FilterSelect,
    AppCard,
    StatusBadge,
    Modal,
    ConfirmDialog,
    PlanificacionForm,
  ],
  templateUrl: './planificaciones.html',
  styleUrl: './planificaciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanificacionesPage {
  private readonly api = inject(PlanificacionesService);
  private readonly empresasApi = inject(EmpresasService);
  private readonly feedback = inject(FeedbackService);

  readonly opcionesEstado: FilterOption[] = [
    { value: 'BORRADOR', label: 'BORRADOR' },
    { value: 'ACTIVA', label: 'ACTIVA' },
    { value: 'CERRADA', label: 'CERRADA' },
    { value: 'CANCELADA', label: 'CANCELADA' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6];
  readonly subtitulo = 'Gestión mensual de la operación por empresa cliente.';

  readonly planificaciones = signal<Planificacion[]>([]);
  readonly empresas = signal<Empresa[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly empresaFiltro = signal('');
  readonly periodoFiltro = signal('');
  readonly estadoFiltro = signal('');

  readonly formularioAbierto = signal(false);
  readonly modo = signal<ModoFormulario>('crear');
  readonly planificacionEdicion = signal<Planificacion | null>(null);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);

  readonly confirmacionAbierta = signal(false);
  readonly planificacionEstado = signal<Planificacion | null>(null);
  readonly destinoEstado = signal<DestinoEstado | null>(null);
  readonly idCambiandoEstado = signal<number | null>(null);

  readonly opcionesEmpresa = computed<FilterOption[]>(() =>
    this.empresas().map((empresa) => ({
      value: String(empresa.idEmpresa),
      label: empresa.razonSocial,
    })),
  );

  readonly empresasFormulario = computed(() => {
    const activas = this.empresas().filter((empresa) => empresa.estado === 'ACTIVO');
    const edicion = this.planificacionEdicion();
    if (!edicion) {
      return activas;
    }

    if (activas.some((empresa) => empresa.idEmpresa === edicion.idEmpresa)) {
      return activas;
    }

    const actual = this.empresas().find((empresa) => empresa.idEmpresa === edicion.idEmpresa);
    return actual ? [actual, ...activas] : activas;
  });

  readonly hayFiltros = computed(
    () => !!this.empresaFiltro() || !!this.periodoFiltro() || !!this.estadoFiltro(),
  );

  readonly tituloFormulario = computed(() =>
    this.modo() === 'editar' ? 'Editar planificación' : 'Nueva planificación',
  );

  readonly tituloConfirmacion = computed(() => {
    switch (this.destinoEstado()) {
      case 'ACTIVA':
        return 'Activar planificación';
      case 'CERRADA':
        return 'Cerrar planificación';
      case 'CANCELADA':
        return 'Cancelar planificación';
      default:
        return 'Confirmar acción';
    }
  });

  readonly mensajeConfirmacion = computed(() => {
    const item = this.planificacionEstado();
    if (!item) {
      return '';
    }

    if (this.destinoEstado() === 'ACTIVA') {
      return `¿Deseas activar la planificación ${item.periodo}?`;
    }

    if (this.destinoEstado() === 'CERRADA') {
      return `¿Deseas cerrar la planificación ${item.periodo}? Esta acción no podrá revertirse.`;
    }

    return `¿Deseas cancelar la planificación ${item.periodo}?`;
  });

  readonly confirmacionPeligrosa = computed(() => this.destinoEstado() === 'CANCELADA');

  constructor() {
    this.cargarEmpresas();
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const idEmpresa = Number(this.empresaFiltro());
    const periodo = this.periodoFiltro();
    const estado = this.estadoFiltro() as EstadoPlanificacion | '';

    this.api
      .listar({
        idEmpresa: Number.isInteger(idEmpresa) && idEmpresa > 0 ? idEmpresa : undefined,
        periodo: periodo || undefined,
        estado: estado || undefined,
      })
      .subscribe({
        next: (lista) => {
          this.planificaciones.set(lista);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeErrorHttp(err, 'No fue posible cargar las planificaciones.'));
        },
      });
  }

  actualizarEmpresaFiltro(valor: string): void {
    this.empresaFiltro.set(valor);
    this.cargar();
  }

  actualizarPeriodoFiltro(evento: Event): void {
    this.periodoFiltro.set((evento.target as HTMLInputElement).value);
    this.cargar();
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.empresaFiltro.set('');
    this.periodoFiltro.set('');
    this.estadoFiltro.set('');
    this.cargar();
  }

  abrirCrear(): void {
    this.modo.set('crear');
    this.planificacionEdicion.set(null);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  abrirEditar(planificacion: Planificacion): void {
    if (planificacion.estado !== 'BORRADOR') {
      return;
    }

    this.modo.set('editar');
    this.planificacionEdicion.set(planificacion);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.formularioAbierto.set(false);
    this.planificacionEdicion.set(null);
    this.errorFormulario.set(null);
  }

  guardar(solicitud: CrearPlanificacionSolicitud): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const esEdicion = this.modo() === 'editar';
    const edicion = this.planificacionEdicion();
    const peticion =
      esEdicion && edicion
        ? this.api.editar(edicion.idPlanificacion, solicitud)
        : this.api.crear(solicitud);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.planificacionEdicion.set(null);
        this.feedback.mostrar(
          esEdicion ? 'Planificación actualizada correctamente.' : 'Planificación creada correctamente.',
        );
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible guardar la planificación.'));
      },
    });
  }

  pedirCambioEstado(planificacion: Planificacion, destino: DestinoEstado): void {
    if (this.estaCambiandoEstado(planificacion.idPlanificacion)) {
      return;
    }

    this.planificacionEstado.set(planificacion);
    this.destinoEstado.set(destino);
    this.confirmacionAbierta.set(true);
  }

  cancelarCambioEstado(): void {
    this.confirmacionAbierta.set(false);
    this.planificacionEstado.set(null);
    this.destinoEstado.set(null);
  }

  confirmarCambioEstado(): void {
    const planificacion = this.planificacionEstado();
    const destino = this.destinoEstado();
    if (!planificacion || !destino || this.estaCambiandoEstado(planificacion.idPlanificacion)) {
      return;
    }

    this.confirmacionAbierta.set(false);
    this.planificacionEstado.set(null);
    this.destinoEstado.set(null);
    this.idCambiandoEstado.set(planificacion.idPlanificacion);

    this.api.cambiarEstado(planificacion.idPlanificacion, { estado: destino }).subscribe({
      next: () => {
        this.idCambiandoEstado.set(null);
        this.feedback.mostrar(this.mensajeExitoEstado(destino));
        this.cargar();
      },
      error: (err: unknown) => {
        this.idCambiandoEstado.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cambiar el estado de la planificación.'));
      },
    });
  }

  estaCambiandoEstado(idPlanificacion: number): boolean {
    return this.idCambiandoEstado() === idPlanificacion;
  }

  tonoEstado(estado: EstadoPlanificacion): BadgeTone {
    switch (estado) {
      case 'ACTIVA':
        return 'green';
      case 'BORRADOR':
        return 'amber';
      case 'CERRADA':
        return 'sky';
      case 'CANCELADA':
        return 'red';
    }
  }

  private cargarEmpresas(): void {
    this.empresasApi.listar().subscribe({
      next: (lista) => this.empresas.set(lista),
      error: () => this.empresas.set([]),
    });
  }

  private mensajeExitoEstado(destino: DestinoEstado): string {
    if (destino === 'ACTIVA') {
      return 'Planificación activada correctamente.';
    }

    if (destino === 'CERRADA') {
      return 'Planificación cerrada correctamente.';
    }

    return 'Planificación cancelada correctamente.';
  }
}
