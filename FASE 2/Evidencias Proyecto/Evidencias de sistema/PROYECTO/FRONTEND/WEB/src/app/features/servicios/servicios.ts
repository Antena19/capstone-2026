import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { AsignacionServicio } from '../../core/models/asignacion';
import { Conductor } from '../../core/models/conductor';
import { Empresa } from '../../core/models/empresa';
import { EstadoPlanificacion, Planificacion } from '../../core/models/planificacion';
import { Ruta } from '../../core/models/ruta';
import {
  AltaServicio,
  CancelacionServicio,
  EdicionServicio,
  EstadoServicio,
  PasajeroServicio,
  Servicio,
  TipoServicio,
} from '../../core/models/servicio';
import { Vehiculo } from '../../core/models/vehiculo';
import { AsignacionesService } from '../../core/services/asignaciones.service';
import { ConductoresService } from '../../core/services/conductores.service';
import { EmpresasService } from '../../core/services/empresas.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { PasajerosServicioService } from '../../core/services/pasajeros-servicio.service';
import { PlanificacionesService } from '../../core/services/planificaciones.service';
import { RutasService } from '../../core/services/rutas.service';
import { ServiciosService } from '../../core/services/servicios.service';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { PaginacionLista } from '../../core/utils/paginacion';
import {
  ContextoRefrescoWeb,
  RefrescoWeb,
  conservarListadoAnteError,
  escucharVisibilidadDocumento,
  presentarCargaListado,
  relojIntervaloNavegador,
} from '../../core/utils/refresco-web';
import { clasificarErrorAsignacion, idsPendientes, mensajeCuerpo } from './asignacion-creacion';
import { planificacionPermiteAdministrar } from './planificacion-administrable';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { Icon } from '../../shared/components/icon/icon';
import { Modal } from '../../shared/components/modal/modal';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Paginacion } from '../../shared/components/paginacion/paginacion';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { ServicioAsignacionForm } from './servicio-asignacion-form';
import { ServicioCancelarDialog } from './servicio-cancelar-dialog';
import { ServicioAsistencia } from './servicio-asistencia';
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
    Icon,
    Modal,
    ServicioForm,
    ServicioDetalle,
    ServicioEditarForm,
    ServicioCancelarDialog,
    ServicioPasajerosForm,
    ServicioAsignacionForm,
    ServicioAsistencia,
    Paginacion,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly asignacionesApi = inject(AsignacionesService);
  private readonly conductoresApi = inject(ConductoresService);
  private readonly vehiculosApi = inject(VehiculosService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);
  private readonly refresco = new RefrescoWeb(
    (contexto) => this.ejecutarCarga(contexto),
    relojIntervaloNavegador,
    escucharVisibilidadDocumento(),
  );

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
  readonly rutas = signal<Ruta[]>([]);
  private readonly estadosPlanificacion = signal<ReadonlyMap<number, EstadoPlanificacion>>(new Map());
  private readonly planificacionesConsultadas = signal(false);
  readonly conductores = signal<Conductor[]>([]);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly asignaciones = signal<AsignacionServicio[]>([]);
  readonly asociaciones = signal<PasajeroServicio[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly empresaFiltro = signal('');
  readonly fechaFiltro = signal('');
  readonly estadoFiltro = signal('');
  readonly tipoFiltro = signal('');
  readonly paginacion = new PaginacionLista(
    () => this.servicios(),
    () => `${this.empresaFiltro()}|${this.fechaFiltro()}|${this.estadoFiltro()}|${this.tipoFiltro()}`,
  );
  readonly filas = computed(() => this.paginacion.recortar());

  readonly formularioAbierto = signal(false);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);
  readonly idsCreados = signal<number[]>([]);
  readonly idsAsignados = signal<number[]>([]);
  readonly serviciosYaCreados = signal(false);
  private readonly avisoPasajerosCreacion = signal<string | null>(null);
  readonly faseCreacion = signal<'crear' | 'asignar' | ''>('');
  readonly avisoAbandono = signal(false);
  readonly progresoCreacion = signal('');
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
  readonly asistenciaAbierta = signal(false);
  readonly servicioAsistencia = signal<Servicio | null>(null);

  private readonly gestionCmp = viewChild(ServicioPasajerosForm);
  private readonly asignacionCmp = viewChild(ServicioAsignacionForm);

  readonly opcionesEmpresa = computed<FilterOption[]>(() =>
    this.empresas().map((empresa) => ({
      value: String(empresa.idEmpresa),
      label: empresa.razonSocial,
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
    () => !!this.fechaFiltro() || !!this.estadoFiltro() || !!this.tipoFiltro(),
  );

  readonly nombreEmpresaSeleccionada = computed(
    () => this.nombresEmpresa().get(Number(this.empresaFiltro())) ?? '',
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

  readonly tituloAsistencia = computed(() => {
    const servicio = this.servicioAsistencia();
    return servicio ? `Asistencia del servicio #${servicio.idServicio}` : 'Asistencia del servicio';
  });

  readonly formularioOperativoAbierto = computed(
    () =>
      this.formularioAbierto() ||
      this.edicionAbierta() ||
      this.asignacionAbierta() ||
      this.gestionAbierta() ||
      this.cancelacionAbierta(),
  );

  constructor() {
    this.cargarCatalogos();
    this.refresco.iniciar();
    this.destroyRef.onDestroy(() => this.refresco.detener());
  }

  cargar(): void {
    this.refresco.solicitar(false, true);
  }

  private pausarListado(): void {
    this.refresco.pausar();
  }

  private reanudarListado(): void {
    if (this.formularioOperativoAbierto()) {
      return;
    }

    this.refresco.reanudar();
  }

  private ejecutarCarga(contexto: ContextoRefrescoWeb): void {
    const idEmpresa = Number(this.empresaFiltro());
    if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
      this.servicios.set([]);
      this.asignaciones.set([]);
      this.asociaciones.set([]);
      this.estadosPlanificacion.set(new Map());
      this.planificacionesConsultadas.set(false);
      this.cargando.set(false);
      this.error.set(null);
      this.refresco.completar(contexto.generacion);
      return;
    }

    const presentacion = presentarCargaListado(this.servicios().length > 0, contexto.automatico);
    if (presentacion.mostrarEsqueleto) {
      this.cargando.set(true);
    }
    if (presentacion.limpiarError) {
      this.error.set(null);
    }
    const estado = this.estadoFiltro() as EstadoServicio | '';
    const tipoServicio = this.tipoFiltro() as TipoServicio | '';

    forkJoin({
      lista: this.api.listar({
        idEmpresa,
        fecha: this.fechaFiltro() || undefined,
        estado: estado || undefined,
        tipoServicio: tipoServicio || undefined,
      }),
      asignaciones: this.asignacionesApi.listar({ estado: 'ACTIVA' }).pipe(catchError(() => of([]))),
      asociaciones: this.pasajerosServicioApi.listar({ estado: 'ACTIVO' }).pipe(catchError(() => of([]))),
      planificaciones: this.planificacionesApi.listar({ idEmpresa }).pipe(catchError(() => of(null))),
    })
      .subscribe({
        next: ({ lista, asignaciones, asociaciones, planificaciones }) => {
          if (!this.refresco.esVigente(contexto.generacion) || Number(this.empresaFiltro()) !== idEmpresa) {
            this.refresco.completar(contexto.generacion);
            return;
          }

          const ids = new Set(lista.map((servicio) => servicio.idServicio));
          this.asignaciones.set(asignaciones.filter((item) => ids.has(item.idServicio)));
          this.asociaciones.set(asociaciones.filter((item) => ids.has(item.idServicio)));
          this.aplicarPlanificaciones(planificaciones);
          this.servicios.set([...lista].sort(compararServicios));
          this.cargando.set(false);
          this.error.set(null);
          this.refresco.completar(contexto.generacion);
        },
        error: (err: unknown) => {
          if (!this.refresco.esVigente(contexto.generacion) || Number(this.empresaFiltro()) !== idEmpresa) {
            this.refresco.completar(contexto.generacion);
            return;
          }

          this.cargando.set(false);
          if (!conservarListadoAnteError(this.servicios().length > 0, contexto.automatico)) {
            this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los servicios.'));
          }
          this.refresco.completar(contexto.generacion);
        },
      });
  }

  actualizarEmpresaFiltro(valor: string): void {
    this.empresaFiltro.set(valor);
    this.servicios.set([]);
    this.asignaciones.set([]);
    this.asociaciones.set([]);
    this.estadosPlanificacion.set(new Map());
    this.planificacionesConsultadas.set(false);
    this.error.set(null);
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
    this.fechaFiltro.set('');
    this.estadoFiltro.set('');
    this.tipoFiltro.set('');
    this.cargar();
  }

  abrirCrear(): void {
    if (!this.empresaFiltro() || this.formularioAbierto()) {
      return;
    }

    this.limpiarCreacion();
    this.errorFormulario.set(null);
    this.aviso.set(null);
    this.formularioAbierto.set(true);
    this.pausarListado();
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    const pendientes = idsPendientes(this.idsCreados(), this.idsAsignados());
    const sinIdentificadores = this.serviciosYaCreados() && this.idsCreados().length === 0;
    if (pendientes.length > 0 || sinIdentificadores) {
      if (!this.avisoAbandono()) {
        this.avisoAbandono.set(true);
        this.errorFormulario.set(
          'Los servicios ya fueron creados, pero quedaron asignaciones pendientes. Si cierras, no se completarán al recargar la página. Podrás asignar conductor y vehículo desde cada servicio PROGRAMADO en la grilla.',
        );
        return;
      }

      this.feedback.mostrar(
        'Quedaron servicios sin conductor o vehículo. Complétalos desde la grilla; al recargar no se reanuda este intento.',
        8000,
      );
      this.limpiarCreacion();
      this.formularioAbierto.set(false);
      this.errorFormulario.set(null);
      this.reanudarListado();
      return;
    }

    this.limpiarCreacion();
    this.formularioAbierto.set(false);
    this.errorFormulario.set(null);
    this.reanudarListado();
  }

  guardar(alta: AltaServicio): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.avisoAbandono.set(false);
    this.errorFormulario.set(null);
    this.aviso.set(null);

    if (this.serviciosYaCreados()) {
      this.asignarPendientes(alta.idConductor, alta.idVehiculo);
      return;
    }

    this.faseCreacion.set('crear');
    this.progresoCreacion.set(
      alta.modalidad === 'recurrente' ? 'Creando los servicios de la serie...' : 'Creando el servicio...',
    );

    if (alta.modalidad === 'individual') {
      this.api
        .crear(alta.solicitud)
        .pipe(
          tap((servicio) => this.registrarCreados([servicio.idServicio])),
          switchMap((servicio) => {
            if (alta.pasajeros.length === 0 || !(servicio.idServicio > 0)) {
              return of(null);
            }

            return this.pasajerosServicioApi
              .crearLote({ idServicio: servicio.idServicio, pasajeros: alta.pasajeros })
              .pipe(
                map(() => null),
                catchError((err: unknown) =>
                  of(
                    this.mensajeErrorParcial(
                      servicio,
                      mensajeErrorHttp(err, 'No fue posible asociar los pasajeros.'),
                    ),
                  ),
                ),
              );
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (avisoPasajeros) => {
            if (avisoPasajeros) {
              this.avisoPasajerosCreacion.set(avisoPasajeros);
            }

            this.asignarPendientes(alta.idConductor, alta.idVehiculo);
          },
          error: (err: unknown) => {
            this.guardando.set(false);
            this.faseCreacion.set('');
            this.progresoCreacion.set('');
            if (!this.serviciosYaCreados()) {
              this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible crear el servicio.'));
              return;
            }

            this.errorFormulario.set(
              'El servicio ya fue creado. No se volverá a crear. Reintenta solo la asignación pendiente.',
            );
          },
        });
      return;
    }

    this.api.crearRecurrentes(alta.solicitud).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        const ids = (respuesta.servicios ?? []).map((servicio) => servicio.idServicio);
        this.registrarCreados(ids);
        this.asignarPendientes(alta.idConductor, alta.idVehiculo);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.faseCreacion.set('');
        this.progresoCreacion.set('');
        if (!this.serviciosYaCreados()) {
          this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible crear la serie de servicios.'));
          return;
        }

        this.errorFormulario.set(
          'La serie ya fue creada. No se volverá a crear. Reintenta solo las asignaciones pendientes.',
        );
      },
    });
  }

  private registrarCreados(ids: readonly number[]): void {
    this.serviciosYaCreados.set(true);
    const validos = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
    this.idsCreados.set(validos);
  }

  private asignarPendientes(idConductor: number, idVehiculo: number): void {
    if (this.idsCreados().length === 0) {
      this.guardando.set(false);
      this.faseCreacion.set('');
      this.progresoCreacion.set('');
      this.errorFormulario.set(
        'Los servicios ya fueron creados, pero la respuesta no incluyó los identificadores. No se volverá a crear. Completa conductor y vehículo desde cada servicio PROGRAMADO en la grilla. Al recargar la página este intento no se reanuda.',
      );
      return;
    }

    this.faseCreacion.set('asignar');
    this.asignarSiguiente(idsPendientes(this.idsCreados(), this.idsAsignados()), idConductor, idVehiculo);
  }

  private asignarSiguiente(pendientes: number[], idConductor: number, idVehiculo: number): void {
    const idServicio = pendientes[0];
    if (idServicio == null) {
      this.completarCreacion(this.avisoPasajerosCreacion());
      return;
    }

    const hechas = this.idsAsignados().length;
    const total = this.idsCreados().length;
    this.progresoCreacion.set(`Asignando conductor y vehículo (${hechas + 1} de ${total})...`);

    this.asignacionesApi.listar({ idServicio, estado: 'ACTIVA' }).pipe(
      switchMap((existentes) => {
        if (existentes.length > 0) {
          return of('ya-existia' as const);
        }

        return this.asignacionesApi.crear({ idServicio, idConductor, idVehiculo }).pipe(map(() => 'creada' as const));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.idsAsignados.update((actual) => actual.includes(idServicio) ? actual : [...actual, idServicio]);
        this.asignarSiguiente(pendientes.slice(1), idConductor, idVehiculo);
      },
      error: (err: unknown) => {
        const estado = err instanceof HttpErrorResponse ? err.status : 0;
        const clase = clasificarErrorAsignacion(estado, mensajeCuerpo(err));
        if (clase === 'ya-existia') {
          this.idsAsignados.update((actual) => actual.includes(idServicio) ? actual : [...actual, idServicio]);
          this.asignarSiguiente(pendientes.slice(1), idConductor, idVehiculo);
          return;
        }

        this.guardando.set(false);
        this.progresoCreacion.set('');
        const detalle = mensajeErrorHttp(err, 'No fue posible asignar el conductor y el vehículo.');
        const motivo = clase === 'horario' ? `Hay un conflicto de horario: ${detalle}` : detalle;
        this.errorFormulario.set(
          `Los servicios ya fueron creados, pero quedaron asignaciones pendientes. ${motivo} Elige otro conductor o vehículo y reintenta solo lo pendiente. No se crearán servicios de nuevo.`,
        );
      },
    });
  }

  private completarCreacion(avisoPasajeros: string | null): void {
    const cantidad = this.idsCreados().length;
    this.limpiarCreacion();
    this.guardando.set(false);
    this.formularioAbierto.set(false);
    this.errorFormulario.set(null);
    this.reanudarListado();
    if (avisoPasajeros) {
      this.aviso.set(avisoPasajeros);
      this.feedback.mostrar(avisoPasajeros, 8000);
      return;
    }

    this.feedback.mostrar(
      cantidad > 1
        ? `Serie creada y asignada correctamente (${cantidad} servicios).`
        : 'Servicio creado y asignado correctamente.',
    );
  }

  private limpiarCreacion(): void {
    this.idsCreados.set([]);
    this.idsAsignados.set([]);
    this.serviciosYaCreados.set(false);
    this.avisoPasajerosCreacion.set(null);
    this.faseCreacion.set('');
    this.avisoAbandono.set(false);
    this.progresoCreacion.set('');
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

  abrirAsistencia(servicio: Servicio): void {
    if (servicio.estado !== 'FINALIZADO') {
      return;
    }

    this.servicioAsistencia.set(servicio);
    this.asistenciaAbierta.set(true);
  }

  cerrarAsistencia(): void {
    this.asistenciaAbierta.set(false);
    this.servicioAsistencia.set(null);
  }

  verRuta(servicio: Servicio): void {
    if (!servicio.idRuta) {
      return;
    }

    void this.router.navigate(['/rutas'], {
      queryParams: {
        empresa: String(servicio.idEmpresa),
        ruta: servicio.idRuta,
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleAbierto.set(false);
    this.servicioDetalle.set(null);
  }

  abrirGestionPasajeros(servicio: Servicio): void {
    if (!this.puedeGestionarPasajeros(servicio)) {
      return;
    }

    this.servicioGestion.set(servicio);
    this.detalleAbierto.set(false);
    this.servicioDetalle.set(null);
    this.gestionAbierta.set(true);
    this.pausarListado();
  }

  cerrarGestionPasajeros(): void {
    if (this.gestionCmp()?.mutando()) {
      return;
    }

    const servicio = this.servicioGestion();
    this.gestionAbierta.set(false);
    this.servicioGestion.set(null);
    this.reanudarListado();
    if (servicio) {
      this.ver(servicio);
    }
  }

  abrirAsignacion(servicio: Servicio): void {
    if (!this.puedeCambiarAsignacion(servicio) && !this.puedeCrearAsignacion(servicio)) {
      return;
    }

    this.servicioAsignacion.set(servicio);
    this.detalleAbierto.set(false);
    this.servicioDetalle.set(null);
    this.asignacionAbierta.set(true);
    this.pausarListado();
  }

  cerrarAsignacion(): void {
    if (this.asignacionCmp()?.mutando()) {
      return;
    }

    const servicio = this.servicioAsignacion();
    this.asignacionAbierta.set(false);
    this.servicioAsignacion.set(null);
    this.reanudarListado();
    if (servicio) {
      this.ver(servicio);
    }
  }

  guardarAsignacion(): void {
    const servicio = this.servicioAsignacion();
    this.asignacionAbierta.set(false);
    this.servicioAsignacion.set(null);
    this.reanudarListado();
    if (servicio) {
      this.ver(servicio);
    }
  }

  abrirEditar(servicio: Servicio): void {
    if (!this.puedeEditar(servicio)) {
      return;
    }

    this.servicioEdicion.set(servicio);
    this.errorEdicion.set(null);
    this.edicionAbierta.set(true);
    this.pausarListado();
  }

  cerrarEdicion(): void {
    if (this.guardandoEdicion()) {
      return;
    }

    this.edicionAbierta.set(false);
    this.servicioEdicion.set(null);
    this.errorEdicion.set(null);
    this.reanudarListado();
  }

  guardarEdicion(edicion: EdicionServicio): void {
    const servicio = this.servicioEdicion();
    if (this.guardandoEdicion()) {
      return;
    }

    if (!servicio || !this.puedeEditar(servicio)) {
      this.errorEdicion.set('Esta planificación no admite modificar el servicio.');
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
          this.reanudarListado();
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
        this.reanudarListado();
      },
      error: (err: unknown) => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(mensajeErrorHttp(err, 'No fue posible guardar los cambios del servicio.'));
      },
    });
  }

  puedeEditar(servicio: Servicio): boolean {
    return servicio.estado === 'PROGRAMADO' && this.administrable(servicio);
  }

  puedeCancelar(servicio: Servicio): boolean {
    return (servicio.estado === 'PROGRAMADO' || servicio.estado === 'EN_CURSO') && this.administrable(servicio);
  }

  puedeGestionarPasajeros(servicio: Servicio): boolean {
    return servicio.estado === 'PROGRAMADO' && this.administrable(servicio);
  }

  puedeCrearAsignacion(servicio: Servicio): boolean {
    return servicio.estado === 'PROGRAMADO' && !this.asignacionActiva(servicio.idServicio) && this.administrable(servicio);
  }

  puedeCambiarAsignacion(servicio: Servicio): boolean {
    const estado = servicio.estado;
    return !!this.asignacionActiva(servicio.idServicio)
      && estado !== 'FINALIZADO'
      && estado !== 'CANCELADO'
      && this.administrable(servicio);
  }

  pedirCancelar(servicio: Servicio): void {
    if (!this.puedeCancelar(servicio)) {
      return;
    }

    this.servicioCancelacion.set(servicio);
    this.errorCancelacion.set(null);
    this.cancelacionAbierta.set(true);
    this.pausarListado();
  }

  cerrarCancelacion(): void {
    if (this.cancelando()) {
      return;
    }

    this.cancelacionAbierta.set(false);
    this.servicioCancelacion.set(null);
    this.errorCancelacion.set(null);
    this.reanudarListado();
  }

  confirmarCancelacion(cancelacion: CancelacionServicio): void {
    const servicio = this.servicioCancelacion();
    if (this.cancelando()) {
      return;
    }

    if (!servicio || !this.puedeCancelar(servicio)) {
      this.errorCancelacion.set('Esta planificación no admite cancelar el servicio.');
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
          this.reanudarListado();
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
          this.reanudarListado();
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

  conductorDe(servicio: Servicio): string {
    const asignacion = this.asignacionActiva(servicio.idServicio);
    if (!asignacion) {
      return 'Sin asignar';
    }

    return (
      this.conductores().find((item) => item.idConductor === asignacion.idConductor)?.nombre
      ?? `Conductor #${asignacion.idConductor}`
    );
  }

  patenteDe(servicio: Servicio): string {
    return this.vehiculoDe(servicio.idServicio)?.patente ?? 'Sin asignar';
  }

  capacidadDe(servicio: Servicio): string {
    const vehiculo = this.vehiculoDe(servicio.idServicio);
    if (!vehiculo) {
      return 'Sin asignar';
    }

    const ocupados = this.asociaciones().filter(
      (item) => item.idServicio === servicio.idServicio && item.estado === 'ACTIVO',
    ).length;
    return `${ocupados}/${vehiculo.capacidad}`;
  }

  esSinAsignar(valor: string): boolean {
    return valor === 'Sin asignar';
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

  etiquetaEstado(estado: EstadoServicio): string {
    return estado === 'EN_CURSO' ? 'EN CURSO' : estado;
  }

  textoEstado(estado: EstadoServicio): string {
    switch (estado) {
      case 'PROGRAMADO':
        return 'Servicio planificado. Se puede editar, gestionar pasajeros y cancelar.';
      case 'EN_CURSO':
        return 'Servicio iniciado. Se puede cancelar. Los pasajeros ya no se pueden modificar.';
      case 'FINALIZADO':
        return 'Servicio terminado. Se puede consultar la asistencia registrada.';
      case 'CANCELADO':
        return 'Servicio cancelado. Solo consulta.';
    }
  }

  private cargarCatalogos(): void {
    forkJoin({
      empresas: this.empresasApi.listar().pipe(catchError(() => of([] as Empresa[]))),
      rutas: this.rutasApi.listar().pipe(catchError(() => of([] as Ruta[]))),
      conductores: this.conductoresApi.listar().pipe(catchError(() => of([] as Conductor[]))),
      vehiculos: this.vehiculosApi.listar().pipe(catchError(() => of([] as Vehiculo[]))),
    }).subscribe({
      next: ({ empresas, rutas, conductores, vehiculos }) => {
        this.empresas.set(empresas);
        this.rutas.set(rutas);
        this.conductores.set(conductores);
        this.vehiculos.set(vehiculos);
      },
    });
  }

  private aplicarPlanificaciones(lista: Planificacion[] | null): void {
    if (!lista) {
      this.estadosPlanificacion.set(new Map());
      this.planificacionesConsultadas.set(false);
      return;
    }

    this.estadosPlanificacion.set(new Map(lista.map((item) => [item.idPlanificacion, item.estado])));
    this.planificacionesConsultadas.set(true);
  }

  private administrable(servicio: Servicio): boolean {
    if (!this.planificacionesConsultadas()) {
      return false;
    }

    return planificacionPermiteAdministrar(this.estadosPlanificacion().get(servicio.idPlanificacion));
  }

  private asignacionActiva(idServicio: number): AsignacionServicio | null {
    return this.asignaciones().find((item) => item.idServicio === idServicio && item.estado === 'ACTIVA') ?? null;
  }

  private vehiculoDe(idServicio: number): Vehiculo | null {
    const asignacion = this.asignacionActiva(idServicio);
    if (!asignacion) {
      return null;
    }

    return this.vehiculos().find((item) => item.idVehiculo === asignacion.idVehiculo) ?? null;
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

function compararServicios(a: Servicio, b: Servicio): number {
  const fechaA = a.fecha.slice(0, 10);
  const fechaB = b.fecha.slice(0, 10);
  if (fechaA !== fechaB) {
    return fechaA < fechaB ? 1 : -1;
  }

  if (a.horaInicio !== b.horaInicio) {
    return a.horaInicio < b.horaInicio ? 1 : -1;
  }

  return b.idServicio - a.idServicio;
}
