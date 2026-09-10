import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { Empresa } from '../../core/models/empresa';
import { Planificacion } from '../../core/models/planificacion';
import { Ruta } from '../../core/models/ruta';
import {
  AltaServicio,
  CancelacionServicio,
  EdicionServicio,
  EstadoServicio,
  Servicio,
  TipoServicio,
} from '../../core/models/servicio';
import { EmpresasService } from '../../core/services/empresas.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { PasajerosServicioService } from '../../core/services/pasajeros-servicio.service';
import { PlanificacionesService } from '../../core/services/planificaciones.service';
import { RutasService } from '../../core/services/rutas.service';
import { ServiciosService } from '../../core/services/servicios.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { Modal } from '../../shared/components/modal/modal';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BadgeTone, StatusBadge } from '../../shared/components/status-badge/status-badge';
import { ServicioAsignacionForm } from './servicio-asignacion-form';
import { ServicioCancelarDialog } from './servicio-cancelar-dialog';
import { ServicioDetalle } from './servicio-detalle';
import { ServicioEditarForm } from './servicio-editar-form';
import { ServicioForm } from './servicio-form';
import { ServicioPasajerosForm } from './servicio-pasajeros-form';

@Component({
  selector: 'app-servicios',
  imports: [
    PageHeader,
    ActionButton,
    FilterSelect,
    AppCard,
    StatusBadge,
    Modal,
    ServicioForm,
    ServicioDetalle,
    ServicioEditarForm,
    ServicioCancelarDialog,
    ServicioPasajerosForm,
    ServicioAsignacionForm,
  ],
  templateUrl: './servicios.html',
  styleUrl: './servicios.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiciosPage {
  private readonly api = inject(ServiciosService);
  private readonly pasajerosServicioApi = inject(PasajerosServicioService);
  private readonly empresasApi = inject(EmpresasService);
  private readonly planificacionesApi = inject(PlanificacionesService);
  private readonly rutasApi = inject(RutasService);
  private readonly feedback = inject(FeedbackService);

  readonly opcionesEstado: FilterOption[] = [
    { value: 'PROGRAMADO', label: 'PROGRAMADO' },
    { value: 'EN_CURSO', label: 'EN CURSO' },
    { value: 'FINALIZADO', label: 'FINALIZADO' },
    { value: 'CANCELADO', label: 'CANCELADO' },
  ];

  readonly opcionesTipo: FilterOption[] = [
    { value: 'IDA', label: 'IDA' },
    { value: 'REGRESO', label: 'REGRESO' },
    { value: 'ESPECIAL', label: 'ESPECIAL' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6];
  readonly subtitulo = 'Gestión de servicios de transporte asociados a cada planificación.';

  readonly servicios = signal<Servicio[]>([]);
  readonly empresas = signal<Empresa[]>([]);
  readonly planificaciones = signal<Planificacion[]>([]);
  readonly rutas = signal<Ruta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly empresaFiltro = signal('');
  readonly planificacionFiltro = signal('');
  readonly fechaFiltro = signal('');
  readonly estadoFiltro = signal('');
  readonly tipoFiltro = signal('');

  readonly formularioAbierto = signal(false);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);
  readonly detalleAbierto = signal(false);
  readonly servicioDetalle = signal<Servicio | null>(null);
  readonly edicionAbierta = signal(false);
  readonly servicioEdicion = signal<Servicio | null>(null);
  readonly guardandoEdicion = signal(false);
  readonly errorEdicion = signal<string | null>(null);
  readonly cancelacionAbierta = signal(false);
  readonly servicioCancelacion = signal<Servicio | null>(null);
  readonly cancelando = signal(false);
  readonly errorCancelacion = signal<string | null>(null);
  readonly gestionAbierta = signal(false);
  readonly servicioGestion = signal<Servicio | null>(null);
  readonly asignacionAbierta = signal(false);
  readonly servicioAsignacion = signal<Servicio | null>(null);

  private readonly gestionCmp = viewChild(ServicioPasajerosForm);
  private readonly asignacionCmp = viewChild(ServicioAsignacionForm);

  readonly opcionesEmpresa = computed<FilterOption[]>(() =>
    this.empresas().map((empresa) => ({
      value: String(empresa.idEmpresa),
      label: empresa.razonSocial,
    })),
  );

  readonly opcionesPlanificacion = computed<FilterOption[]>(() =>
    this.planificaciones().map((planificacion) => ({
      value: String(planificacion.idPlanificacion),
      label: `${planificacion.periodo} · ${planificacion.estado}`,
    })),
  );

  readonly nombresEmpresa = computed(() => {
    const mapa = new Map<number, string>();
    for (const empresa of this.empresas()) {
      mapa.set(empresa.idEmpresa, empresa.razonSocial);
    }
    return mapa;
  });

  readonly nombresRuta = computed(() => {
    const mapa = new Map<string, string>();
    for (const ruta of this.rutas()) {
      mapa.set(ruta.idRuta, ruta.nombre);
    }
    return mapa;
  });

  readonly hayFiltros = computed(
    () =>
      !!this.empresaFiltro()
      || !!this.planificacionFiltro()
      || !!this.fechaFiltro()
      || !!this.estadoFiltro()
      || !!this.tipoFiltro(),
  );

  readonly tituloDetalle = computed(() => {
    const servicio = this.servicioDetalle();
    return servicio ? `Servicio #${servicio.idServicio}` : 'Detalle del servicio';
  });

  readonly nombreEmpresaDetalle = computed(() => {
    const servicio = this.servicioDetalle();
    return servicio ? this.nombreEmpresa(servicio.idEmpresa) : '';
  });

  readonly nombreRutaDetalle = computed(() => {
    const servicio = this.servicioDetalle();
    return servicio ? this.nombreRuta(servicio.idRuta) : '';
  });

  readonly tituloEdicion = computed(() => {
    const servicio = this.servicioEdicion();
    return servicio ? `Editar servicio #${servicio.idServicio}` : 'Editar servicio';
  });

  readonly nombreEmpresaEdicion = computed(() => {
    const servicio = this.servicioEdicion();
    return servicio ? this.nombreEmpresa(servicio.idEmpresa) : '';
  });

  readonly nombreRutaEdicion = computed(() => {
    const servicio = this.servicioEdicion();
    return servicio ? this.nombreRuta(servicio.idRuta) : '';
  });

  readonly tituloCancelacion = computed(() =>
    this.servicioCancelacion()?.idSerie ? 'Cancelar servicios' : 'Cancelar servicio',
  );

  readonly nombreEmpresaCancelacion = computed(() => {
    const servicio = this.servicioCancelacion();
    return servicio ? this.nombreEmpresa(servicio.idEmpresa) : '';
  });

  readonly nombreRutaCancelacion = computed(() => {
    const servicio = this.servicioCancelacion();
    return servicio ? this.nombreRuta(servicio.idRuta) : '';
  });

  readonly tituloGestionPasajeros = computed(() => {
    const servicio = this.servicioGestion();
    return servicio ? `Pasajeros del servicio #${servicio.idServicio}` : 'Gestionar pasajeros';
  });

  readonly nombreEmpresaGestion = computed(() => {
    const servicio = this.servicioGestion();
    return servicio ? this.nombreEmpresa(servicio.idEmpresa) : '';
  });

  readonly nombreRutaGestion = computed(() => {
    const servicio = this.servicioGestion();
    return servicio ? this.nombreRuta(servicio.idRuta) : '';
  });

  readonly tituloAsignacion = computed(() => {
    const servicio = this.servicioAsignacion();
    return servicio ? `Asignación del servicio #${servicio.idServicio}` : 'Asignación operacional';
  });

  constructor() {
    this.cargarCatalogos();
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const idEmpresa = Number(this.empresaFiltro());
    const idPlanificacion = Number(this.planificacionFiltro());
    const estado = this.estadoFiltro() as EstadoServicio | '';
    const tipoServicio = this.tipoFiltro() as TipoServicio | '';

    this.api
      .listar({
        idEmpresa: Number.isInteger(idEmpresa) && idEmpresa > 0 ? idEmpresa : undefined,
        idPlanificacion:
          Number.isInteger(idPlanificacion) && idPlanificacion > 0 ? idPlanificacion : undefined,
        fecha: this.fechaFiltro() || undefined,
        estado: estado || undefined,
        tipoServicio: tipoServicio || undefined,
      })
      .subscribe({
        next: (lista) => {
          this.servicios.set(lista);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los servicios.'));
        },
      });
  }

  actualizarEmpresaFiltro(valor: string): void {
    this.empresaFiltro.set(valor);
    this.planificacionFiltro.set('');
    this.cargarPlanificaciones();
    this.cargar();
  }

  actualizarPlanificacionFiltro(valor: string): void {
    this.planificacionFiltro.set(valor);
    this.cargar();
  }

  actualizarFechaFiltro(evento: Event): void {
    this.fechaFiltro.set((evento.target as HTMLInputElement).value);
    this.cargar();
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargar();
  }

  actualizarTipoFiltro(valor: string): void {
    this.tipoFiltro.set(valor);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.empresaFiltro.set('');
    this.planificacionFiltro.set('');
    this.fechaFiltro.set('');
    this.estadoFiltro.set('');
    this.tipoFiltro.set('');
    this.planificaciones.set([]);
    this.cargar();
  }

  abrirCrear(): void {
    this.errorFormulario.set(null);
    this.aviso.set(null);
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.formularioAbierto.set(false);
    this.errorFormulario.set(null);
  }

  guardar(alta: AltaServicio): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.aviso.set(null);

    if (alta.modalidad === 'individual') {
      this.api
        .crear(alta.solicitud)
        .pipe(
          switchMap((servicio) => {
            if (alta.pasajeros.length === 0) {
              return of({ servicio, loteOk: true as const, detalle: null });
            }

            return this.pasajerosServicioApi
              .crearLote({ idServicio: servicio.idServicio, pasajeros: alta.pasajeros })
              .pipe(
                switchMap(() => of({ servicio, loteOk: true as const, detalle: null })),
                catchError((err: unknown) =>
                  of({
                    servicio,
                    loteOk: false as const,
                    detalle: mensajeErrorHttp(err, 'No fue posible asociar los pasajeros.'),
                  }),
                ),
              );
          }),
        )
        .subscribe({
          next: ({ servicio, loteOk, detalle }) => {
            this.guardando.set(false);
            this.formularioAbierto.set(false);
            this.cargar();
            if (loteOk) {
              this.feedback.mostrar('Servicio creado correctamente.');
              return;
            }

            const mensaje = this.mensajeErrorParcial(servicio, detalle);
            this.aviso.set(mensaje);
            this.feedback.mostrar(mensaje, 8000);
          },
          error: (err: unknown) => {
            this.guardando.set(false);
            this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible crear el servicio.'));
          },
        });
      return;
    }

    this.api.crearRecurrentes(alta.solicitud).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        const cantidad = respuesta.cantidadServicios;
        this.feedback.mostrar(
          typeof cantidad === 'number'
            ? `Serie creada correctamente (${cantidad} ${cantidad === 1 ? 'servicio' : 'servicios'}).`
            : 'Serie creada correctamente.',
        );
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible crear la serie de servicios.'));
      },
    });
  }

  private mensajeErrorParcial(servicio: Servicio, detalle: string | null): string {
    const fecha = this.formatearFecha(servicio.fecha);
    const horario = this.formatearHorario(servicio.horaInicio, servicio.horaFin);
    const extra = detalle ? ` ${detalle}` : '';
    return `El servicio #${servicio.idServicio} del ${fecha} (${horario}) se creó, pero ocurrió un error al asociar los pasajeros.${extra}`;
  }

  ver(servicio: Servicio): void {
    this.servicioDetalle.set(servicio);
    this.detalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.detalleAbierto.set(false);
    this.servicioDetalle.set(null);
  }

  abrirGestionPasajeros(servicio: Servicio): void {
    this.servicioGestion.set(servicio);
    this.detalleAbierto.set(false);
    this.servicioDetalle.set(null);
    this.gestionAbierta.set(true);
  }

  cerrarGestionPasajeros(): void {
    if (this.gestionCmp()?.mutando()) {
      return;
    }

    const servicio = this.servicioGestion();
    this.gestionAbierta.set(false);
    this.servicioGestion.set(null);
    if (servicio) {
      this.ver(servicio);
    }
  }

  abrirAsignacion(servicio: Servicio): void {
    this.servicioAsignacion.set(servicio);
    this.detalleAbierto.set(false);
    this.servicioDetalle.set(null);
    this.asignacionAbierta.set(true);
  }

  cerrarAsignacion(): void {
    if (this.asignacionCmp()?.mutando()) {
      return;
    }

    const servicio = this.servicioAsignacion();
    this.asignacionAbierta.set(false);
    this.servicioAsignacion.set(null);
    if (servicio) {
      this.ver(servicio);
    }
  }

  guardarAsignacion(): void {
    const servicio = this.servicioAsignacion();
    this.asignacionAbierta.set(false);
    this.servicioAsignacion.set(null);
    if (servicio) {
      this.ver(servicio);
    }
  }

  abrirEditar(servicio: Servicio): void {
    if (servicio.estado !== 'PROGRAMADO') {
      return;
    }

    this.servicioEdicion.set(servicio);
    this.errorEdicion.set(null);
    this.edicionAbierta.set(true);
  }

  cerrarEdicion(): void {
    if (this.guardandoEdicion()) {
      return;
    }

    this.edicionAbierta.set(false);
    this.servicioEdicion.set(null);
    this.errorEdicion.set(null);
  }

  guardarEdicion(edicion: EdicionServicio): void {
    if (this.guardandoEdicion()) {
      return;
    }

    this.guardandoEdicion.set(true);
    this.errorEdicion.set(null);

    if (edicion.tipo === 'individual') {
      this.api.editar(edicion.idServicio, edicion.solicitud).subscribe({
        next: () => {
          this.guardandoEdicion.set(false);
          this.edicionAbierta.set(false);
          this.servicioEdicion.set(null);
          this.feedback.mostrar('Servicio actualizado correctamente.');
          this.cargar();
        },
        error: (err: unknown) => {
          this.guardandoEdicion.set(false);
          this.errorEdicion.set(mensajeErrorHttp(err, 'No fue posible guardar los cambios del servicio.'));
        },
      });
      return;
    }

    this.api.editarSerie(edicion.idServicio, edicion.solicitud).subscribe({
      next: (servicios) => {
        this.guardandoEdicion.set(false);
        this.edicionAbierta.set(false);
        this.servicioEdicion.set(null);
        const cantidad = servicios.length;
        this.feedback.mostrar(`Se actualizaron ${cantidad} ${cantidad === 1 ? 'servicio' : 'servicios'}.`);
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(mensajeErrorHttp(err, 'No fue posible guardar los cambios del servicio.'));
      },
    });
  }

  puedeCancelar(servicio: Servicio): boolean {
    return servicio.estado === 'PROGRAMADO' || servicio.estado === 'EN_CURSO';
  }

  pedirCancelar(servicio: Servicio): void {
    if (!this.puedeCancelar(servicio)) {
      return;
    }

    this.servicioCancelacion.set(servicio);
    this.errorCancelacion.set(null);
    this.cancelacionAbierta.set(true);
  }

  cerrarCancelacion(): void {
    if (this.cancelando()) {
      return;
    }

    this.cancelacionAbierta.set(false);
    this.servicioCancelacion.set(null);
    this.errorCancelacion.set(null);
  }

  confirmarCancelacion(cancelacion: CancelacionServicio): void {
    if (this.cancelando()) {
      return;
    }

    this.cancelando.set(true);
    this.errorCancelacion.set(null);

    if (cancelacion.tipo === 'individual') {
      this.api.cambiarEstado(cancelacion.idServicio, { estado: 'CANCELADO' }).subscribe({
        next: (servicio) => {
          this.cancelando.set(false);
          this.cancelacionAbierta.set(false);
          this.servicioCancelacion.set(null);
          this.feedback.mostrar('Servicio cancelado correctamente.');
          this.cerrarVistasAfectadas([servicio]);
          this.cargar();
        },
        error: (err: unknown) => this.manejarErrorCancelacion(err, 'No fue posible cancelar el servicio.'),
      });
      return;
    }

    this.api
      .cambiarEstadoSerie(cancelacion.idServicio, {
        alcance: cancelacion.alcance,
        estado: 'CANCELADO',
      })
      .subscribe({
        next: (servicios) => {
          this.cancelando.set(false);
          this.cancelacionAbierta.set(false);
          this.servicioCancelacion.set(null);
          const cantidad = servicios.length;
          this.feedback.mostrar(
            `Se cancelaron ${cantidad} ${cantidad === 1 ? 'servicio' : 'servicios'}.`,
          );
          this.cerrarVistasAfectadas(servicios);
          this.cargar();
        },
        error: (err: unknown) => this.manejarErrorCancelacion(err, 'No fue posible cancelar los servicios.'),
      });
  }

  nombreEmpresa(idEmpresa: number): string {
    return this.nombresEmpresa().get(idEmpresa) ?? `Empresa #${idEmpresa}`;
  }

  nombreRuta(idRuta: string): string {
    return this.nombresRuta().get(idRuta) || 'Ruta sin nombre';
  }

  etiquetaSerie(idSerie: string | null): string {
    return idSerie ? 'Recurrente' : 'Individual';
  }

  formatearFecha(fecha: string): string {
    const iso = fecha.slice(0, 10);
    const partes = iso.split('-');
    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  formatearHorario(horaInicio: string, horaFin: string): string {
    return `${this.formatearHora(horaInicio)} – ${this.formatearHora(horaFin)}`;
  }

  tonoEstado(estado: EstadoServicio): BadgeTone {
    switch (estado) {
      case 'PROGRAMADO':
        return 'amber';
      case 'EN_CURSO':
        return 'green';
      case 'FINALIZADO':
        return 'sky';
      case 'CANCELADO':
        return 'red';
    }
  }

  etiquetaEstado(estado: EstadoServicio): string {
    return estado === 'EN_CURSO' ? 'EN CURSO' : estado;
  }

  private cargarCatalogos(): void {
    forkJoin({
      empresas: this.empresasApi.listar(),
      rutas: this.rutasApi.listar(),
    }).subscribe({
      next: ({ empresas, rutas }) => {
        this.empresas.set(empresas);
        this.rutas.set(rutas);
      },
      error: () => {
        this.empresas.set([]);
        this.rutas.set([]);
      },
    });
  }

  private cargarPlanificaciones(): void {
    const idEmpresa = Number(this.empresaFiltro());
    if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
      this.planificaciones.set([]);
      return;
    }

    this.planificacionesApi.listar({ idEmpresa }).subscribe({
      next: (lista) => this.planificaciones.set(lista),
      error: () => this.planificaciones.set([]),
    });
  }

  private formatearHora(valor: string): string {
    return valor.length >= 5 ? valor.slice(0, 5) : valor;
  }

  private manejarErrorCancelacion(err: unknown, fallback: string): void {
    this.cancelando.set(false);
    this.errorCancelacion.set(mensajeErrorHttp(err, fallback));
    if (this.esErrorEstadoDesactualizado(err)) {
      this.cargar();
    }
  }

  private esErrorEstadoDesactualizado(err: unknown): boolean {
    return err instanceof HttpErrorResponse && (err.status === 400 || err.status === 409);
  }

  private cerrarVistasAfectadas(afectados: Servicio[]): void {
    const ids = new Set(afectados.map((servicio) => servicio.idServicio));
    const detalle = this.servicioDetalle();
    if (detalle && ids.has(detalle.idServicio)) {
      this.cerrarDetalle();
    }

    const edicion = this.servicioEdicion();
    if (edicion && ids.has(edicion.idServicio) && !this.guardandoEdicion()) {
      this.edicionAbierta.set(false);
      this.servicioEdicion.set(null);
      this.errorEdicion.set(null);
    }
  }
}
