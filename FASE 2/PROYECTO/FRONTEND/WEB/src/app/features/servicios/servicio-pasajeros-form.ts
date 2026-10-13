import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, forkJoin, map, of, Subject, switchMap, tap } from 'rxjs';
import { AsignacionServicio } from '../../core/models/asignacion';
import { Pasajero } from '../../core/models/pasajero';
import { EstadoPlanificacion } from '../../core/models/planificacion';
import { PuntoRecogida, Ruta } from '../../core/models/ruta';
import { Vehiculo } from '../../core/models/vehiculo';
import {
  EstadoConfirmacionViaje,
  EstadoPasajeroServicio,
  PasajeroServicio,
  Servicio,
} from '../../core/models/servicio';
import { AsignacionesService } from '../../core/services/asignaciones.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { PasajerosServicioService } from '../../core/services/pasajeros-servicio.service';
import { PlanificacionesService } from '../../core/services/planificaciones.service';
import { RutasService } from '../../core/services/rutas.service';
import { ServiciosService } from '../../core/services/servicios.service';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { SearchInput } from '../../shared/components/search-input/search-input';
import { planificacionPermiteAdministrar } from './planificacion-administrable';

interface AsociadoVista {
  idPasajeroServicio: number;
  idPasajero: number;
  nombre: string;
  rut: string;
  idPuntoRecogida: string | null;
  estadoConfirmacion: EstadoConfirmacionViaje;
  estado: EstadoPasajeroServicio;
  habitual: boolean;
  puntoInvalido: boolean;
  sinPunto: boolean;
  usaHabitual: boolean;
}

interface CandidatoVista {
  idPasajero: number;
  nombre: string;
  rut: string;
  habitual: boolean;
  idPuntoHabitual: string | null;
  seleccionado: boolean;
  idPuntoRecogida: string;
}

@Component({
  selector: 'app-servicio-pasajeros-form',
  imports: [ActionButton, SearchInput],
  templateUrl: './servicio-pasajeros-form.html',
  styleUrl: './servicio-pasajeros-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioPasajerosForm {
  readonly abierto = input(false);
  readonly servicioInicial = input<Servicio | null>(null);
  readonly nombreEmpresaInicial = input('');
  readonly nombreRutaInicial = input('');
  readonly cerrado = output<void>();
  readonly actualizado = output<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(ServiciosService);
  private readonly pasajerosServicioApi = inject(PasajerosServicioService);
  private readonly pasajerosApi = inject(PasajerosService);
  private readonly rutasApi = inject(RutasService);
  private readonly planificacionesApi = inject(PlanificacionesService);
  private readonly asignacionesApi = inject(AsignacionesService);
  private readonly vehiculosApi = inject(VehiculosService);
  private readonly feedback = inject(FeedbackService);
  private readonly pedido = new Subject<Servicio>();

  readonly esqueletos = [1, 2, 3, 4];
  readonly servicio = signal<Servicio | null>(null);
  private readonly estadoPlanificacion = signal<EstadoPlanificacion | null>(null);
  private readonly planificacionConsultada = signal(false);
  readonly ruta = signal<Ruta | null>(null);
  readonly asignacion = signal<AsignacionServicio | null>(null);
  readonly vehiculo = signal<Vehiculo | null>(null);
  readonly asociados = signal<AsociadoVista[]>([]);
  readonly candidatos = signal<CandidatoVista[]>([]);
  readonly puntosEdicion = signal<Record<number, string>>({});
  readonly busqueda = signal('');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorAccion = signal<string | null>(null);
  readonly agregando = signal(false);
  readonly idGuardandoPunto = signal<number | null>(null);
  readonly idQuitando = signal<number | null>(null);
  readonly pendienteQuitar = signal<AsociadoVista | null>(null);

  readonly ocupado = computed(
    () =>
      this.cargando()
      || this.agregando()
      || this.idGuardandoPunto() != null
      || this.idQuitando() != null,
  );

  readonly mutando = computed(
    () => this.agregando() || this.idGuardandoPunto() != null || this.idQuitando() != null,
  );

  readonly puedeAsociar = computed(
    () => this.servicio()?.estado === 'PROGRAMADO' && planificacionPermiteAdministrar(this.estadoPlanificacion()),
  );

  readonly esRecurrente = computed(() => !!this.servicio()?.idSerie);

  readonly puntosRuta = computed(() =>
    [...(this.ruta()?.puntosRecogida ?? [])]
      .filter((punto) => !!punto.idPunto)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')),
  );

  readonly nombreEmpresa = computed(() => this.nombreEmpresaInicial() || '—');

  readonly nombreRuta = computed(() => {
    const nombre = this.ruta()?.nombre;
    if (nombre) {
      return nombre;
    }

    return this.nombreRutaInicial() || 'Ruta sin nombre';
  });

  readonly notaAsociar = computed(() => {
    const estado = this.servicio()?.estado;
    const planificacion = this.estadoPlanificacion();
    if (estado === 'PROGRAMADO' && this.planificacionConsultada() && !planificacionPermiteAdministrar(planificacion)) {
      if (planificacion === 'CERRADA' || planificacion === 'CANCELADA') {
        return `La planificación está ${planificacion}. Solo puedes consultar los pasajeros.`;
      }

      return 'No se pudo confirmar el estado de la planificación. Las modificaciones quedan deshabilitadas.';
    }

    if (!estado || estado === 'PROGRAMADO') {
      return null;
    }

    if (estado === 'FINALIZADO' || estado === 'CANCELADO') {
      return 'No se pueden asociar pasajeros a un servicio FINALIZADO o CANCELADO.';
    }

    return 'Solo se pueden asociar pasajeros a un servicio PROGRAMADO.';
  });

  readonly asociadosVisibles = computed(() =>
    this.asociados().filter((item) => coincideTexto(item.nombre, item.rut, this.busqueda())),
  );

  readonly candidatosVisibles = computed(() =>
    this.candidatos().filter((item) => coincideTexto(item.nombre, item.rut, this.busqueda())),
  );

  readonly seleccionados = computed(() => this.candidatos().filter((item) => item.seleccionado));

  readonly cantidadSeleccionados = computed(() => this.seleccionados().length);

  readonly seleccionIncompleta = computed(() =>
    this.seleccionados().some((item) => !item.idPuntoRecogida),
  );

  readonly pasajerosAsociados = computed(() => this.asociados().length);

  readonly capacidadMaxima = computed(() => this.vehiculo()?.capacidad ?? null);

  readonly cuposDisponibles = computed(() => {
    const capacidad = this.capacidadMaxima();
    if (capacidad == null) {
      return null;
    }

    return Math.max(0, capacidad - this.pasajerosAsociados());
  });

  readonly seleccionExcedeCupo = computed(() => {
    const cupos = this.cuposDisponibles();
    return cupos != null && this.cantidadSeleccionados() > cupos;
  });

  readonly etiquetaVehiculo = computed(() => this.vehiculo()?.patente ?? 'Sin asignar');

  readonly etiquetaCapacidad = computed(() => {
    const capacidad = this.capacidadMaxima();
    return capacidad == null ? 'Sin asignar' : `${capacidad} pasajeros`;
  });

  readonly etiquetaCupos = computed(() => {
    const cupos = this.cuposDisponibles();
    return cupos == null ? 'Sin asignar' : String(cupos);
  });

  readonly etiquetaAgregar = computed(() => {
    if (this.agregando()) {
      return 'Agregando...';
    }

    const cantidad = this.cantidadSeleccionados();
    return cantidad > 0 ? `Agregar seleccionados (${cantidad})` : 'Agregar seleccionados';
  });

  constructor() {
    this.pedido
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.cargando.set(true);
          this.estadoPlanificacion.set(null);
          this.planificacionConsultada.set(false);
          this.error.set(null);
        }),
        switchMap((inicial) =>
          this.api.obtenerPorId(inicial.idServicio).pipe(
            catchError((err: unknown) => {
              this.cargando.set(false);
              this.error.set(mensajeErrorHttp(err, 'No fue posible cargar el servicio.'));
              return EMPTY;
            }),
            switchMap((servicio) =>
              forkJoin({
                asociaciones: this.pasajerosServicioApi.listar({ idServicio: servicio.idServicio }),
                ruta: this.rutasApi.obtener(servicio.idRuta),
                pasajeros: this.pasajerosApi.listar('ACTIVO', servicio.idEmpresa),
                asignaciones: this.asignacionesApi
                  .listar({ idServicio: servicio.idServicio, estado: 'ACTIVA' })
                  .pipe(catchError(() => of([] as AsignacionServicio[]))),
                vehiculos: this.vehiculosApi.listar().pipe(catchError(() => of([] as Vehiculo[]))),
                planificacion: this.planificacionesApi
                  .obtenerPorId(servicio.idPlanificacion)
                  .pipe(catchError(() => of(null))),
              }).pipe(
                map(({ asociaciones, ruta, pasajeros, asignaciones, vehiculos, planificacion }) => ({
                  servicio,
                  asociaciones,
                  ruta,
                  pasajeros,
                  asignaciones,
                  vehiculos,
                  planificacion,
                })),
                catchError((err: unknown) => {
                  this.cargando.set(false);
                  this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los pasajeros del servicio.'));
                  return EMPTY;
                }),
              ),
            ),
          ),
        ),
      )
      .subscribe(({ servicio, asociaciones, ruta, pasajeros, asignaciones, vehiculos, planificacion }) => {
        const asignacion = asignaciones.find((item) => item.estado === 'ACTIVA') ?? null;
        this.estadoPlanificacion.set(planificacion?.estado ?? null);
        this.planificacionConsultada.set(true);
        this.servicio.set(servicio);
        this.ruta.set(ruta);
        this.asignacion.set(asignacion);
        this.vehiculo.set(
          asignacion
            ? vehiculos.find((item) => item.idVehiculo === asignacion.idVehiculo) ?? null
            : null,
        );
        this.aplicarDatos(asociaciones, ruta, pasajeros);
        this.cargando.set(false);
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

      untracked(() => this.pedido.next(inicial));
    });
  }

  reintentar(): void {
    const inicial = this.servicioInicial();
    if (inicial && !this.ocupado()) {
      this.pedido.next(inicial);
    }
  }

  cerrar(): void {
    if (this.mutando()) {
      return;
    }

    this.cerrado.emit();
  }

  etiquetaPunto(punto: PuntoRecogida): string {
    return `${punto.orden} · ${punto.nombre}`;
  }

  nombrePunto(idPunto: string | null): string {
    if (!idPunto) {
      return 'Sin punto de recogida';
    }

    const punto = this.puntosRuta().find((item) => item.idPunto === idPunto);
    return punto ? this.etiquetaPunto(punto) : 'Punto no disponible en la ruta';
  }

  puntoEdicion(idPasajeroServicio: number): string {
    return this.puntosEdicion()[idPasajeroServicio] ?? '';
  }

  puntoDesdeEvento(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  cambiarPuntoAsociado(idPasajeroServicio: number, idPuntoRecogida: string): void {
    this.errorAccion.set(null);
    this.puntosEdicion.update((actual) => ({ ...actual, [idPasajeroServicio]: idPuntoRecogida }));
    const fila = this.asociados().find((item) => item.idPasajeroServicio === idPasajeroServicio);
    if (!fila || !idPuntoRecogida || !this.puedeAplicarPunto(fila)) {
      return;
    }

    if (!this.puntosRuta().some((punto) => punto.idPunto === idPuntoRecogida)) {
      this.errorAccion.set('El punto de recogida debe pertenecer a la ruta de este servicio.');
      return;
    }

    this.aplicarPunto(fila);
  }

  puedeAplicarPunto(fila: AsociadoVista): boolean {
    const elegido = this.puntoEdicion(fila.idPasajeroServicio);
    if (!this.puedeAsociar() || !elegido || this.ocupado()) {
      return false;
    }

    return elegido !== coincidirPuntoRuta(fila.idPuntoRecogida, this.puntosRuta());
  }

  aplicarPunto(fila: AsociadoVista): void {
    if (!this.puedeAplicarPunto(fila) || this.idGuardandoPunto() != null) {
      return;
    }

    const idPuntoRecogida = this.puntoEdicion(fila.idPasajeroServicio);
    if (!idPuntoRecogida) {
      return;
    }

    this.idGuardandoPunto.set(fila.idPasajeroServicio);
    this.errorAccion.set(null);
    this.pasajerosServicioApi
      .asignarPuntoRecogida(fila.idPasajeroServicio, { idPuntoRecogida })
      .subscribe({
        next: () => {
          this.idGuardandoPunto.set(null);
          this.feedback.mostrar('Punto de recogida actualizado.');
          this.actualizado.emit();
          this.recargar();
        },
        error: (err: unknown) => this.manejarErrorAccion(err, 'No fue posible actualizar el punto de recogida.'),
      });
  }

  pedirQuitar(fila: AsociadoVista): void {
    if (!this.puedeAsociar() || this.ocupado()) {
      return;
    }

    this.errorAccion.set(null);
    this.pendienteQuitar.set(fila);
  }

  cancelarQuitar(): void {
    if (this.idQuitando() != null) {
      return;
    }

    this.pendienteQuitar.set(null);
  }

  confirmarQuitar(): void {
    const fila = this.pendienteQuitar();
    if (!this.puedeAsociar() || !fila || this.idQuitando() != null) {
      return;
    }

    this.idQuitando.set(fila.idPasajeroServicio);
    this.errorAccion.set(null);
    this.pasajerosServicioApi
      .cambiarEstado(fila.idPasajeroServicio, { estado: 'CANCELADO' })
      .subscribe({
        next: () => {
          this.idQuitando.set(null);
          this.pendienteQuitar.set(null);
          this.feedback.mostrar(`${fila.nombre} fue quitado de este servicio.`);
          this.actualizado.emit();
          this.recargar();
        },
        error: (err: unknown) => this.manejarErrorAccion(err, 'No fue posible quitar el pasajero del servicio.'),
      });
  }

  alternarCandidato(idPasajero: number): void {
    if (!this.puedeAsociar() || this.ocupado()) {
      return;
    }

    this.errorAccion.set(null);
    this.candidatos.update((lista) =>
      lista.map((item) =>
        item.idPasajero === idPasajero ? { ...item, seleccionado: !item.seleccionado } : item,
      ),
    );
  }

  cambiarPuntoCandidato(idPasajero: number, idPuntoRecogida: string): void {
    this.errorAccion.set(null);
    this.candidatos.update((lista) =>
      lista.map((item) => (item.idPasajero === idPasajero ? { ...item, idPuntoRecogida } : item)),
    );
  }

  agregarSeleccionados(): void {
    if (!this.puedeAsociar() || this.agregando() || this.ocupado()) {
      return;
    }

    const servicio = this.servicio();
    const seleccion = this.seleccionados();
    if (!servicio || seleccion.length === 0) {
      return;
    }

    if (!this.vehiculo()) {
      this.errorAccion.set('Asigna un vehículo antes de agregar pasajeros.');
      return;
    }

    const cupos = this.cuposDisponibles();
    if (cupos != null && seleccion.length > cupos) {
      this.errorAccion.set('La selección supera la capacidad del vehículo.');
      return;
    }

    if (this.seleccionIncompleta()) {
      this.errorAccion.set('Cada pasajero seleccionado debe tener un punto de recogida.');
      return;
    }

    const idsPuntos = new Set(this.puntosRuta().map((punto) => punto.idPunto));
    if (seleccion.some((item) => !idsPuntos.has(item.idPuntoRecogida))) {
      this.errorAccion.set('El punto de recogida debe pertenecer a la ruta de este servicio.');
      return;
    }

    this.agregando.set(true);
    this.errorAccion.set(null);
    this.pasajerosServicioApi
      .crearLote({
        idServicio: servicio.idServicio,
        pasajeros: seleccion.map((item) => ({
          idPasajero: item.idPasajero,
          idPuntoRecogida: item.idPuntoRecogida,
        })),
      })
      .subscribe({
        next: (registros) => {
          this.agregando.set(false);
          const cantidad = registros.length;
          this.feedback.mostrar(
            `Se ${cantidad === 1 ? 'agregó' : 'agregaron'} ${cantidad} ${cantidad === 1 ? 'pasajero' : 'pasajeros'}.`,
          );
          this.actualizado.emit();
          this.recargar();
        },
        error: (err: unknown) => this.manejarErrorAccion(err, 'No fue posible agregar los pasajeros.'),
      });
  }

  private recargar(): void {
    const actual = this.servicio() ?? this.servicioInicial();
    if (actual) {
      this.pedido.next(actual);
    }
  }

  private manejarErrorAccion(err: unknown, fallback: string): void {
    this.agregando.set(false);
    this.idGuardandoPunto.set(null);
    this.idQuitando.set(null);
    this.errorAccion.set(mensajeErrorHttp(err, fallback));
    this.recargar();
  }

  private aplicarDatos(
    asociaciones: PasajeroServicio[],
    ruta: Ruta,
    pasajeros: Pasajero[],
  ): void {
    const puntos = [...(ruta.puntosRecogida ?? [])]
      .filter((punto) => !!punto.idPunto)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
    const habitualPorId = new Map<number, string>();
    for (const punto of puntos) {
      for (const idPasajero of punto.pasajerosIds ?? []) {
        if (!habitualPorId.has(idPasajero)) {
          habitualPorId.set(idPasajero, punto.idPunto);
        }
      }
    }

    const personas = new Map(pasajeros.map((item) => [item.idPasajero, item]));
    const activos = asociaciones.filter((item) => item.estado === 'ACTIVO');
    const idsActivos = new Set(activos.map((item) => item.idPasajero));

    const asociados = activos
      .map((asociacion) => {
        const persona = personas.get(asociacion.idPasajero);
        const crudo = asociacion.idPuntoRecogida?.trim() ?? '';
        const idPuntoPersistido = coincidirPuntoRuta(crudo, puntos);
        const idPuntoHabitual = coincidirPuntoRuta(habitualPorId.get(asociacion.idPasajero), puntos);
        const puntoInvalido = !!crudo && !idPuntoPersistido;
        return {
          idPasajeroServicio: asociacion.idPasajeroServicio,
          idPasajero: asociacion.idPasajero,
          nombre: persona?.nombre ?? `Pasajero #${asociacion.idPasajero}`,
          rut: persona?.rut ?? '—',
          idPuntoRecogida: crudo || null,
          estadoConfirmacion: asociacion.estadoConfirmacion,
          estado: asociacion.estado,
          habitual: !!idPuntoHabitual,
          puntoInvalido,
          sinPunto: !crudo && !idPuntoHabitual,
          usaHabitual: !crudo && !!idPuntoHabitual,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const candidatos = pasajeros
      .filter((pasajero) => pasajero.estado === 'ACTIVO' && !idsActivos.has(pasajero.idPasajero))
      .map((pasajero) => {
        const idPuntoHabitual = habitualPorId.get(pasajero.idPasajero) ?? null;
        return {
          idPasajero: pasajero.idPasajero,
          nombre: pasajero.nombre,
          rut: pasajero.rut,
          habitual: idPuntoHabitual != null,
          idPuntoHabitual,
          seleccionado: false,
          idPuntoRecogida: idPuntoHabitual ?? '',
        };
      })
      .sort((a, b) => {
        if (a.habitual !== b.habitual) {
          return a.habitual ? -1 : 1;
        }

        return a.nombre.localeCompare(b.nombre, 'es');
      });

    const edicion: Record<number, string> = {};
    for (const fila of asociados) {
      const persistido = coincidirPuntoRuta(fila.idPuntoRecogida, puntos);
      const habitual = coincidirPuntoRuta(habitualPorId.get(fila.idPasajero), puntos);
      edicion[fila.idPasajeroServicio] = persistido || (fila.puntoInvalido ? (fila.idPuntoRecogida ?? '') : habitual);
    }

    this.asociados.set(asociados);
    this.candidatos.set(candidatos);
    this.puntosEdicion.set(edicion);
  }

  private limpiar(): void {
    this.servicio.set(null);
    this.estadoPlanificacion.set(null);
    this.planificacionConsultada.set(false);
    this.ruta.set(null);
    this.asignacion.set(null);
    this.vehiculo.set(null);
    this.asociados.set([]);
    this.candidatos.set([]);
    this.puntosEdicion.set({});
    this.busqueda.set('');
    this.cargando.set(false);
    this.error.set(null);
    this.errorAccion.set(null);
    this.agregando.set(false);
    this.idGuardandoPunto.set(null);
    this.idQuitando.set(null);
    this.pendienteQuitar.set(null);
  }
}

function coincidirPuntoRuta(
  idPuntoRecogida: string | null | undefined,
  puntos: readonly PuntoRecogida[],
): string {
  const crudo = idPuntoRecogida?.trim() ?? '';
  if (!crudo) {
    return '';
  }

  const exacto = puntos.find((punto) => punto.idPunto === crudo);
  if (exacto) {
    return exacto.idPunto;
  }

  const insensible = puntos.find((punto) => punto.idPunto.toLowerCase() === crudo.toLowerCase());
  return insensible?.idPunto ?? '';
}

function coincideTexto(nombre: string, rut: string, termino: string): boolean {
  const consulta = normalizarBusqueda(termino);
  if (!consulta) {
    return true;
  }

  const hay = normalizarBusqueda(`${nombre} ${rut}`);
  const compacto = hay.replace(/\s+/g, '');
  const consultaCompacta = consulta.replace(/\s+/g, '');
  return hay.includes(consulta) || compacto.includes(consultaCompacta);
}

function normalizarBusqueda(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9+]+/g, ' ')
    .trim()
    .toLowerCase();
}
