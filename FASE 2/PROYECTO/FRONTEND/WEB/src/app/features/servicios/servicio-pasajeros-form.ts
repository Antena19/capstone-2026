import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, forkJoin, map, Subject, switchMap, tap } from 'rxjs';
import { Pasajero } from '../../core/models/pasajero';
import { PuntoRecogida, Ruta } from '../../core/models/ruta';
import {
  EstadoConfirmacionViaje,
  EstadoPasajeroServicio,
  PasajeroServicio,
  Servicio,
} from '../../core/models/servicio';
import { FeedbackService } from '../../core/services/feedback.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { PasajerosServicioService } from '../../core/services/pasajeros-servicio.service';
import { RutasService } from '../../core/services/rutas.service';
import { ServiciosService } from '../../core/services/servicios.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { SearchInput } from '../../shared/components/search-input/search-input';
import { BadgeTone, StatusBadge } from '../../shared/components/status-badge/status-badge';

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
  imports: [ActionButton, SearchInput, StatusBadge],
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
  private readonly feedback = inject(FeedbackService);
  private readonly pedido = new Subject<Servicio>();

  readonly esqueletos = [1, 2, 3, 4];
  readonly servicio = signal<Servicio | null>(null);
  readonly ruta = signal<Ruta | null>(null);
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

  readonly puedeAsociar = computed(() => this.servicio()?.estado === 'PROGRAMADO');

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
              }).pipe(
                map(({ asociaciones, ruta, pasajeros }) => ({ servicio, asociaciones, ruta, pasajeros })),
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
      .subscribe(({ servicio, asociaciones, ruta, pasajeros }) => {
        this.servicio.set(servicio);
        this.ruta.set(ruta);
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

  puntoEdicion(idPasajeroServicio: number): string {
    return this.puntosEdicion()[idPasajeroServicio] ?? '';
  }

  puntoDesdeEvento(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  cambiarPuntoAsociado(idPasajeroServicio: number, idPuntoRecogida: string): void {
    this.errorAccion.set(null);
    this.puntosEdicion.update((actual) => ({ ...actual, [idPasajeroServicio]: idPuntoRecogida }));
  }

  puedeAplicarPunto(fila: AsociadoVista): boolean {
    const elegido = this.puntoEdicion(fila.idPasajeroServicio);
    if (!elegido || this.ocupado()) {
      return false;
    }

    return elegido !== (fila.idPuntoRecogida ?? '');
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
    if (this.ocupado()) {
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
    if (!fila || this.idQuitando() != null) {
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
    const idsPuntos = new Set(puntos.map((punto) => punto.idPunto));
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
        const puntoInvalido = !!asociacion.idPuntoRecogida && !idsPuntos.has(asociacion.idPuntoRecogida);
        return {
          idPasajeroServicio: asociacion.idPasajeroServicio,
          idPasajero: asociacion.idPasajero,
          nombre: persona?.nombre ?? `Pasajero #${asociacion.idPasajero}`,
          rut: persona?.rut ?? '—',
          idPuntoRecogida: asociacion.idPuntoRecogida,
          estadoConfirmacion: asociacion.estadoConfirmacion,
          estado: asociacion.estado,
          habitual: habitualPorId.has(asociacion.idPasajero),
          puntoInvalido,
          sinPunto: !asociacion.idPuntoRecogida,
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
      edicion[fila.idPasajeroServicio] = fila.puntoInvalido ? '' : (fila.idPuntoRecogida ?? '');
    }

    this.asociados.set(asociados);
    this.candidatos.set(candidatos);
    this.puntosEdicion.set(edicion);
  }

  private limpiar(): void {
    this.servicio.set(null);
    this.ruta.set(null);
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
