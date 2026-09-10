import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, forkJoin, map, of, Subject, switchMap, tap } from 'rxjs';
import { AsignacionServicio, EstadoAsignacionServicio } from '../../core/models/asignacion';
import { Conductor } from '../../core/models/conductor';
import { Pasajero } from '../../core/models/pasajero';
import { Planificacion } from '../../core/models/planificacion';
import { PuntoRecogida, Ruta } from '../../core/models/ruta';
import {
  EstadoConfirmacionViaje,
  EstadoPasajeroServicio,
  EstadoServicio,
  PasajeroServicio,
  Servicio,
} from '../../core/models/servicio';
import { Vehiculo } from '../../core/models/vehiculo';
import { AsignacionesService } from '../../core/services/asignaciones.service';
import { ConductoresService } from '../../core/services/conductores.service';
import { EmpresasService } from '../../core/services/empresas.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { PasajerosServicioService } from '../../core/services/pasajeros-servicio.service';
import { PlanificacionesService } from '../../core/services/planificaciones.service';
import { RutasService } from '../../core/services/rutas.service';
import { ServiciosService } from '../../core/services/servicios.service';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { BadgeTone, StatusBadge } from '../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-servicio-detalle',
  imports: [ActionButton, StatusBadge],
  templateUrl: './servicio-detalle.html',
  styleUrl: './servicio-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioDetalle {
  readonly abierto = input(false);
  readonly servicioInicial = input<Servicio | null>(null);
  readonly nombreEmpresaInicial = input('');
  readonly nombreRutaInicial = input('');
  readonly cerrado = output<void>();
  readonly gestionar = output<Servicio>();
  readonly asignar = output<Servicio>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(ServiciosService);
  private readonly empresasApi = inject(EmpresasService);
  private readonly planificacionesApi = inject(PlanificacionesService);
  private readonly rutasApi = inject(RutasService);
  private readonly pasajerosApi = inject(PasajerosService);
  private readonly pasajerosServicioApi = inject(PasajerosServicioService);
  private readonly asignacionesApi = inject(AsignacionesService);
  private readonly conductoresApi = inject(ConductoresService);
  private readonly vehiculosApi = inject(VehiculosService);
  private readonly pedidoDetalle = new Subject<Servicio>();
  private readonly pedidoComplementos = new Subject<Servicio>();

  readonly esqueletos = [1, 2, 3];
  readonly servicio = signal<Servicio | null>(null);
  readonly empresaNombre = signal('');
  readonly ruta = signal<Ruta | null>(null);
  readonly planificacion = signal<Planificacion | null>(null);
  readonly asociaciones = signal<PasajeroServicio[] | null>([]);
  readonly pasajeros = signal<Pasajero[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly cargandoPasajeros = signal(false);
  readonly errorPasajeros = signal<string | null>(null);
  readonly asignacion = signal<AsignacionServicio | null>(null);
  readonly conductorAsignado = signal<Conductor | null>(null);
  readonly vehiculoAsignado = signal<Vehiculo | null>(null);
  readonly errorAsignacion = signal<string | null>(null);

  readonly nombreEmpresa = computed(() => {
    const actual = this.empresaNombre();
    if (actual) {
      return actual;
    }

    const inicial = this.nombreEmpresaInicial();
    if (inicial) {
      return inicial;
    }

    const id = this.servicio()?.idEmpresa;
    return id ? `Empresa #${id}` : '—';
  });

  readonly nombreRuta = computed(() => {
    const nombre = this.ruta()?.nombre;
    if (nombre) {
      return nombre;
    }

    const inicial = this.nombreRutaInicial();
    if (inicial) {
      return inicial;
    }

    return this.servicio()?.idRuta ? 'Ruta sin nombre' : '—';
  });

  readonly etiquetaPlanificacion = computed(() => {
    const planificacion = this.planificacion();
    if (planificacion) {
      return `${planificacion.periodo} · ${planificacion.estado}`;
    }

    const id = this.servicio()?.idPlanificacion;
    return id ? `Planificación #${id}` : '—';
  });

  readonly etiquetaModalidad = computed(() =>
    this.servicio()?.idSerie ? 'Recurrente' : 'Individual',
  );

  readonly pasajerosActivos = computed(
    () => (this.asociaciones() ?? []).filter((item) => item.estado === 'ACTIVO').length,
  );

  readonly puedeCrearAsignacion = computed(
    () => this.servicio()?.estado === 'PROGRAMADO' && !this.asignacion(),
  );

  readonly puedeCambiarAsignacion = computed(() => {
    const estado = this.servicio()?.estado;
    return !!this.asignacion() && estado !== 'FINALIZADO' && estado !== 'CANCELADO';
  });

  readonly pasajerosVisibles = computed(() => {
    const asociaciones = this.asociaciones();
    if (!asociaciones) {
      return [];
    }

    const personas = new Map(this.pasajeros().map((item) => [item.idPasajero, item]));
    const puntos = new Map(
      (this.ruta()?.puntosRecogida ?? [])
        .filter((punto) => !!punto.idPunto)
        .map((punto) => [punto.idPunto, punto]),
    );

    return [...asociaciones]
      .map((asociacion) => {
        const persona = personas.get(asociacion.idPasajero);
        return {
          id: asociacion.idPasajeroServicio,
          nombre: persona?.nombre ?? `Pasajero #${asociacion.idPasajero}`,
          rut: persona?.rut ?? '—',
          punto: etiquetaPunto(asociacion.idPuntoRecogida, puntos),
          estadoConfirmacion: asociacion.estadoConfirmacion,
          estado: asociacion.estado,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  constructor() {
    this.pedidoDetalle
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((inicial) => {
          this.servicio.set(inicial);
          this.empresaNombre.set(this.nombreEmpresaInicial());
          this.ruta.set(null);
          this.planificacion.set(null);
          this.asociaciones.set([]);
          this.pasajeros.set([]);
          this.asignacion.set(null);
          this.conductorAsignado.set(null);
          this.vehiculoAsignado.set(null);
          this.error.set(null);
          this.errorPasajeros.set(null);
          this.errorAsignacion.set(null);
          this.cargando.set(true);
          this.cargandoPasajeros.set(true);
        }),
        switchMap((inicial) =>
          this.api.obtenerPorId(inicial.idServicio).pipe(
            catchError((err: unknown) => {
              this.cargando.set(false);
              this.error.set(mensajeErrorHttp(err, 'No fue posible cargar el detalle del servicio.'));
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe((servicio) => {
        this.servicio.set(servicio);
        this.cargando.set(false);
        this.pedidoComplementos.next(servicio);
      });

    this.pedidoComplementos
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.cargandoPasajeros.set(true);
          this.errorPasajeros.set(null);
          this.errorAsignacion.set(null);
        }),
        switchMap((servicio) => this.complementos$(servicio)),
      )
      .subscribe({
        next: ({ empresa, ruta, planificacion, asociaciones, pasajeros, asignacion, conductor, vehiculo }) => {
          if (empresa?.razonSocial) {
            this.empresaNombre.set(empresa.razonSocial);
          }
          this.ruta.set(ruta);
          this.planificacion.set(planificacion);
          this.asociaciones.set(asociaciones);
          this.pasajeros.set(pasajeros);
          this.asignacion.set(asignacion);
          this.conductorAsignado.set(conductor);
          this.vehiculoAsignado.set(vehiculo);
          this.cargandoPasajeros.set(false);
        },
        error: (err: unknown) => {
          this.cargandoPasajeros.set(false);
          this.errorPasajeros.set(mensajeErrorHttp(err, 'No fue posible cargar los pasajeros del servicio.'));
        },
      });

    effect(() => {
      const abierto = this.abierto();
      const inicial = this.servicioInicial();
      if (!abierto || !inicial) {
        if (!abierto) {
          untracked(() => this.limpiar());
        }
        return;
      }

      untracked(() => this.pedidoDetalle.next(inicial));
    });
  }

  reintentar(): void {
    const inicial = this.servicioInicial();
    if (inicial) {
      this.pedidoDetalle.next(inicial);
    }
  }

  reintentarPasajeros(): void {
    const actual = this.servicio();
    if (actual && !this.error()) {
      this.pedidoComplementos.next(actual);
    }
  }

  abrirGestionPasajeros(): void {
    const actual = this.servicio();
    if (!actual || this.error()) {
      return;
    }

    this.gestionar.emit(actual);
  }

  abrirAsignacion(): void {
    const actual = this.servicio();
    if (!actual || this.error() || (!this.puedeCrearAsignacion() && !this.puedeCambiarAsignacion())) {
      return;
    }

    this.asignar.emit(actual);
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

  tonoConfirmacion(estado: EstadoConfirmacionViaje): BadgeTone {
    switch (estado) {
      case 'CONFIRMADO':
        return 'green';
      case 'RECHAZADO':
        return 'red';
      case 'PENDIENTE':
        return 'amber';
    }
  }

  tonoAsociacion(estado: EstadoPasajeroServicio): BadgeTone {
    return estado === 'ACTIVO' ? 'green' : 'red';
  }

  tonoAsignacion(estado: EstadoAsignacionServicio): BadgeTone {
    switch (estado) {
      case 'ACTIVA':
        return 'green';
      case 'CANCELADA':
        return 'red';
      case 'REEMPLAZADA':
        return 'slate';
    }
  }

  etiquetaConductorAsignado(): string {
    const conductor = this.conductorAsignado();
    const asignacion = this.asignacion();
    if (conductor) {
      return `${conductor.nombre} · ${conductor.rut}`;
    }

    return asignacion ? `Conductor #${asignacion.idConductor}` : '—';
  }

  etiquetaVehiculoAsignado(): string {
    const vehiculo = this.vehiculoAsignado();
    const asignacion = this.asignacion();
    if (vehiculo) {
      return `${vehiculo.patente} · ${vehiculo.tipo} · ${vehiculo.marca} ${vehiculo.modelo}`;
    }

    return asignacion ? `Vehículo #${asignacion.idVehiculo}` : '—';
  }

  formatearFechaHora(valor: string): string {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return valor;
    }

    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const yyyy = fecha.getFullYear();
    const hh = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  }

  formatearFecha(fecha: string): string {
    const iso = fecha.slice(0, 10);
    const partes = iso.split('-');
    return partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
  }

  formatearHora(valor: string): string {
    return valor.length >= 5 ? valor.slice(0, 5) : valor;
  }

  private complementos$(servicio: Servicio) {
    const empresa$ = this.nombreEmpresaInicial()
      ? of(null)
      : this.empresasApi.obtenerPorId(servicio.idEmpresa).pipe(catchError(() => of(null)));

    return forkJoin({
      empresa: empresa$,
      ruta: this.rutasApi.obtener(servicio.idRuta).pipe(catchError(() => of(null))),
      planificacion: this.planificacionesApi
        .obtenerPorId(servicio.idPlanificacion)
        .pipe(catchError(() => of(null))),
      asociaciones: this.pasajerosServicioApi.listar({ idServicio: servicio.idServicio }).pipe(
        catchError((err: unknown) => {
          this.errorPasajeros.set(mensajeErrorHttp(err, 'No fue posible cargar los pasajeros del servicio.'));
          return of(null);
        }),
      ),
      pasajeros: this.pasajerosApi
        .listar(undefined, servicio.idEmpresa)
        .pipe(catchError(() => of([] as Pasajero[]))),
      asignaciones: this.asignacionesApi.listar({ idServicio: servicio.idServicio, estado: 'ACTIVA' }).pipe(
        catchError((err: unknown) => {
          this.errorAsignacion.set(mensajeErrorHttp(err, 'No fue posible cargar la asignación.'));
          return of(null);
        }),
      ),
    }).pipe(
      switchMap((datos) => {
        const activa = datos.asignaciones
          ? [...datos.asignaciones]
              .filter((item) => item.estado === 'ACTIVA')
              .sort((a, b) => b.idAsignacion - a.idAsignacion)[0] ?? null
          : null;

        if (!activa) {
          return of({
            ...datos,
            asignacion: null as AsignacionServicio | null,
            conductor: null as Conductor | null,
            vehiculo: null as Vehiculo | null,
          });
        }

        return forkJoin({
          conductor: this.conductoresApi.obtenerPorId(activa.idConductor).pipe(catchError(() => of(null))),
          vehiculo: this.vehiculosApi.obtenerPorId(activa.idVehiculo).pipe(catchError(() => of(null))),
        }).pipe(
          map(({ conductor, vehiculo }) => ({
            ...datos,
            asignacion: activa,
            conductor,
            vehiculo,
          })),
        );
      }),
    );
  }

  private limpiar(): void {
    this.servicio.set(null);
    this.empresaNombre.set('');
    this.ruta.set(null);
    this.planificacion.set(null);
    this.asociaciones.set([]);
    this.pasajeros.set([]);
    this.asignacion.set(null);
    this.conductorAsignado.set(null);
    this.vehiculoAsignado.set(null);
    this.cargando.set(false);
    this.error.set(null);
    this.cargandoPasajeros.set(false);
    this.errorPasajeros.set(null);
    this.errorAsignacion.set(null);
  }
}

function etiquetaPunto(idPunto: string | null, puntos: Map<string, PuntoRecogida>): string {
  if (!idPunto) {
    return 'Sin punto asignado';
  }

  const punto = puntos.get(idPunto);
  return punto ? `${punto.orden} · ${punto.nombre}` : 'Punto no disponible';
}
