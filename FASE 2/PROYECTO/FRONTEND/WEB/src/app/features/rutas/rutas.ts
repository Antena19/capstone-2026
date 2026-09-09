import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { fromEvent } from 'rxjs';
import { LngLatBounds, Map as MapaLibre, MapMouseEvent, Marker, NavigationControl, Popup } from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import { EmpresasService } from '../../core/services/empresas.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { RutasService } from '../../core/services/rutas.service';
import { Empresa } from '../../core/models/empresa';
import { PasajeroMapa } from '../../core/models/pasajero-mapa';
import { ExtremoRuta, LineaGeoJson, PuntoGeoJson, PuntoRecogida, Ruta } from '../../core/models/ruta';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { Modal } from '../../shared/components/modal/modal';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SearchInput } from '../../shared/components/search-input/search-input';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { coincidePasajero } from './buscar-pasajeros';
import { CENTRO_PUERTO_MONTT, ESTILO_MAPA_BASE, LAYER_TRAZADO, SOURCE_TRAZADO, ZOOM_CIUDAD, ZOOM_PASAJERO, configurarWorkerMapLibre } from './mapa-base';

type TabPanel = 'pasajeros' | 'puntos' | 'recorrido';
type FiltroAsignacion = 'todos' | 'sin' | 'con';
type TipoConfirmacion = 'geo' | 'eliminar' | 'mover';
type TipoExtremo = 'origen' | 'destino';

@Component({
  selector: 'app-rutas',
  imports: [
    PageHeader,
    FilterSelect,
    ActionButton,
    StatusBadge,
    ConfirmDialog,
    SearchInput,
    Modal,
    CdkDropList,
    CdkDrag,
  ],
  templateUrl: './rutas.html',
  styleUrl: './rutas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RutasPage {
  private readonly empresasApi = inject(EmpresasService);
  private readonly api = inject(RutasService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zona = inject(NgZone);
  private readonly contenedorMapa = viewChild<ElementRef<HTMLDivElement>>('mapa');

  private mapa: MapaLibre | null = null;
  private marcadoresPasajeros = new Map<number, Marker>();
  private marcadoresPuntos = new Map<string, Marker>();
  private marcadorOrigen: Marker | null = null;
  private marcadorDestino: Marker | null = null;
  private manejarClickMapa = (evento: MapMouseEvent) => {
    this.zona.run(() => this.alClickMapa(evento));
  };

  readonly empresas = signal<Empresa[]>([]);
  readonly pasajeros = signal<PasajeroMapa[]>([]);
  readonly rutas = signal<Ruta[]>([]);
  readonly ruta = signal<Ruta | null>(null);
  readonly idEmpresa = signal('');
  readonly idRuta = signal('');
  readonly tab = signal<TabPanel>('pasajeros');
  readonly busqueda = signal('');
  readonly filtroAsignacion = signal<FiltroAsignacion>('todos');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly batchEnCurso = signal(false);
  readonly idGeocodificando = signal<number | null>(null);
  readonly seleccionadoId = signal<number | null>(null);
  readonly puntoSeleccionadoId = signal<string | null>(null);
  readonly modoCrearPunto = signal(false);
  readonly modoMoverPunto = signal(false);
  readonly modoDefinirExtremo = signal<TipoExtremo | null>(null);
  readonly modoMoverExtremo = signal<TipoExtremo | null>(null);
  readonly pendienteCreacion = signal<{ lng: number; lat: number } | null>(null);
  readonly movimientoPendiente = signal<{ lng: number; lat: number } | null>(null);
  readonly modalPuntoAbierto = signal(false);
  readonly editandoPunto = signal(false);
  readonly nombrePunto = signal('');
  readonly referenciaPunto = signal('');
  readonly modalExtremoAbierto = signal(false);
  readonly editandoExtremo = signal(false);
  readonly nombreExtremo = signal('');
  readonly referenciaExtremo = signal('');
  readonly calcularEnCurso = signal(false);
  readonly modalRutaAbierta = signal(false);
  readonly nombreRuta = signal('');
  readonly sectorRuta = signal('');
  readonly modalAsignarAbierto = signal(false);
  readonly busquedaAsignacion = signal('');
  readonly filtroModal = signal<FiltroAsignacion>('todos');
  readonly idsAsignados = signal<Set<number>>(new Set());
  readonly guardando = signal(false);
  readonly confirmacionAbierta = signal(false);
  readonly tipoConfirmacion = signal<TipoConfirmacion>('geo');
  readonly puntoAEliminar = signal<PuntoRecogida | null>(null);

  readonly opcionesEmpresa = computed<FilterOption[]>(() =>
    this.empresas()
      .filter((empresa) => empresa.estado === 'ACTIVO')
      .map((empresa) => ({
        value: String(empresa.idEmpresa),
        label: `${empresa.razonSocial} · ${empresa.rut}`,
      })),
  );

  readonly opcionesRuta = computed<FilterOption[]>(() =>
    this.rutas().map((ruta) => ({
      value: ruta.idRuta,
      label: ruta.nombre,
    })),
  );

  readonly totalActivos = computed(() => this.pasajeros().length);
  readonly geocodificados = computed(() =>
    this.pasajeros().filter((p) => p.estadoGeocodificacion === 'GEOCODIFICADO').length,
  );
  readonly pendientes = computed(() =>
    this.pasajeros().filter((p) => p.estadoGeocodificacion !== 'GEOCODIFICADO').length,
  );

  readonly asignacionPorPasajero = computed(() => {
    const mapa = new Map<string, PuntoRecogida>();
    for (const punto of this.ruta()?.puntosRecogida ?? []) {
      for (const id of punto.pasajerosIds ?? []) {
        mapa.set(String(id), punto);
      }
    }

    return mapa;
  });

  readonly puntosOrdenados = computed(() =>
    [...(this.ruta()?.puntosRecogida ?? [])].sort((a, b) => a.orden - b.orden),
  );

  readonly puedeCalcular = computed(() => {
    const ruta = this.ruta();
    return !!ruta?.origen && !!ruta.destino && !this.calcularEnCurso() && !this.guardando();
  });

  readonly etiquetaCalcular = computed(() => (this.ruta()?.trazado ? 'Recalcular ruta' : 'Calcular ruta'));

  readonly estadoRecorrido = computed(() => {
    const ruta = this.ruta();
    if (!ruta?.origen || !ruta.destino) {
      return 'Ruta sin calcular';
    }

    if (!ruta.trazado) {
      return 'Pendiente de calcular';
    }

    return 'Ruta calculada';
  });

  readonly textoDistancia = computed(() => {
    const ruta = this.ruta();
    if (!ruta?.trazado || !ruta.distanciaEstimadaKm) {
      return '—';
    }

    return `${ruta.distanciaEstimadaKm.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
  });

  readonly textoDuracion = computed(() => {
    const ruta = this.ruta();
    if (!ruta?.trazado || !ruta.duracionEstimadaMin) {
      return '—';
    }

    return `${ruta.duracionEstimadaMin} min`;
  });

  readonly pasajerosVisibles = computed(() => {
    const termino = this.busqueda();
    const filtro = this.filtroAsignacion();
    const asignacion = this.asignacionPorPasajero();
    return this.pasajeros().filter((pasajero) => {
      if (!coincidePasajero(pasajero, termino)) {
        return false;
      }

      const tienePunto = asignacion.has(String(pasajero.idPasajero));
      if (filtro === 'sin') {
        return !tienePunto;
      }

      if (filtro === 'con') {
        return tienePunto;
      }

      return true;
    });
  });

  readonly hayFiltroPasajeros = computed(
    () => this.busqueda().trim().length > 0 || this.filtroAsignacion() !== 'todos',
  );

  readonly pasajerosModal = computed(() => {
    const termino = this.busquedaAsignacion();
    const filtro = this.filtroModal();
    const asignacion = this.asignacionPorPasajero();
    const puntoId = this.puntoSeleccionadoId();
    return this.pasajeros().filter((pasajero) => {
      if (!coincidePasajero(pasajero, termino)) {
        return false;
      }

      const punto = asignacion.get(String(pasajero.idPasajero));
      if (filtro === 'sin') {
        return !punto;
      }

      if (filtro === 'con') {
        return !!punto && punto.idPunto !== puntoId;
      }

      return true;
    });
  });

  readonly tituloConfirmacion = computed(() => {
    switch (this.tipoConfirmacion()) {
      case 'eliminar':
        return 'Eliminar punto';
      case 'mover':
        return 'Mover pasajeros';
      default:
        return 'Geocodificar pendientes';
    }
  });

  readonly etiquetaConfirmar = computed(() => {
    switch (this.tipoConfirmacion()) {
      case 'eliminar':
        return 'Eliminar';
      case 'mover':
        return 'Mover';
      default:
        return 'Geocodificar';
    }
  });

  readonly mensajeConfirmacion = computed(() => {
    switch (this.tipoConfirmacion()) {
      case 'eliminar': {
        const punto = this.puntoAEliminar();
        const extra = (punto?.pasajerosIds?.length ?? 0) > 0
          ? ' Los pasajeros asociados se desasignarán de este punto.'
          : '';
        return `¿Eliminar el punto ${punto?.idPunto ?? ''} - ${punto?.nombre ?? ''}?${extra}`;
      }
      case 'mover':
        return 'Algunos pasajeros ya están en otro punto de esta ruta. Se moverán al punto actual.';
      default:
        return `Se geocodificarán ${this.pendientes()} direcciones pendientes de esta empresa.`;
    }
  });

  constructor() {
    this.empresasApi.listar('ACTIVO').subscribe({
      next: (empresas) => this.empresas.set(empresas),
      error: (err: unknown) => {
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar las empresas.'));
      },
    });

    afterNextRender(() => this.inicializarMapa());

    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.mapa?.resize());

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (evento.key !== 'Escape') {
          return;
        }

        if (
          this.modalPuntoAbierto()
          || this.modalRutaAbierta()
          || this.modalAsignarAbierto()
          || this.modalExtremoAbierto()
          || this.confirmacionAbierta()
        ) {
          return;
        }

        this.cancelarModosMapa();
      });

    this.destroyRef.onDestroy(() => {
      this.mapa?.off('click', this.manejarClickMapa);
      this.limpiarMarcadoresPasajeros();
      this.limpiarMarcadoresPuntos();
      this.mapa?.remove();
      this.mapa = null;
    });
  }

  seleccionarEmpresa(valor: string): void {
    this.cancelarModosMapa();
    this.idEmpresa.set(valor);
    this.idRuta.set('');
    this.ruta.set(null);
    this.rutas.set([]);
    this.seleccionadoId.set(null);
    this.puntoSeleccionadoId.set(null);
    this.busqueda.set('');
    this.filtroAsignacion.set('todos');
    this.limpiarMarcadoresPuntos();
    this.actualizarTrazadoMapa(null);
    if (!valor) {
      this.pasajeros.set([]);
      this.actualizarMarcadoresPasajeros(true);
      return;
    }

    this.cargarPasajeros();
    this.cargarRutas();
  }

  seleccionarRuta(valor: string): void {
    this.cancelarModosMapa();
    this.idRuta.set(valor);
    this.puntoSeleccionadoId.set(null);
    if (!valor) {
      this.ruta.set(null);
      this.actualizarMarcadoresPuntos(true);
      this.actualizarTrazadoMapa(null);
      return;
    }

    const local = this.rutas().find((item) => item.idRuta === valor) ?? null;
    this.ruta.set(local ? this.normalizarRuta(local) : null);
    this.actualizarMarcadoresPuntos(true);
    this.api.obtener(valor).subscribe({
      next: (ruta) => {
        if (this.idRuta() !== valor) {
          return;
        }

        this.aplicarRuta(ruta, true);
      },
      error: (err: unknown) => {
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar la ruta.'));
      },
    });
  }

  cargarPasajeros(): void {
    const idEmpresa = Number(this.idEmpresa());
    if (!Number.isInteger(idEmpresa) || idEmpresa < 1) {
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.api.listarPasajeros(idEmpresa).subscribe({
      next: (pasajeros) => {
        this.cargando.set(false);
        this.pasajeros.set(pasajeros);
        this.actualizarMarcadoresPasajeros(true);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.pasajeros.set([]);
        this.actualizarMarcadoresPasajeros(true);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los pasajeros.'));
      },
    });
  }

  cargarRutas(): void {
    const idEmpresa = Number(this.idEmpresa());
    if (!Number.isInteger(idEmpresa) || idEmpresa < 1) {
      return;
    }

    this.api.listar(idEmpresa, 'ACTIVO').subscribe({
      next: (rutas) => this.rutas.set(rutas),
      error: (err: unknown) => {
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar las rutas.'));
      },
    });
  }

  abrirNuevaRuta(): void {
    this.nombreRuta.set('');
    this.sectorRuta.set('');
    this.modalRutaAbierta.set(true);
  }

  guardarRuta(): void {
    const idEmpresa = Number(this.idEmpresa());
    const nombre = this.nombreRuta().trim();
    if (!nombre || !Number.isInteger(idEmpresa) || idEmpresa < 1 || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.api.crearDiseno({ nombre, empresaId: idEmpresa, sector: this.sectorRuta().trim() || null }).subscribe({
      next: (ruta) => {
        this.guardando.set(false);
        this.modalRutaAbierta.set(false);
        this.rutas.update((lista) => [...lista, this.normalizarRuta(ruta)]);
        this.idRuta.set(ruta.idRuta);
        this.ruta.set(this.normalizarRuta(ruta));
        this.tab.set('puntos');
        this.feedback.mostrar('Ruta creada.');
        this.actualizarMarcadoresPuntos(true);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible crear la ruta.'));
      },
    });
  }

  activarCrearPunto(): void {
    if (!this.ruta()) {
      return;
    }

    this.cancelarModosMapa();
    this.modoCrearPunto.set(true);
  }

  activarDefinirExtremo(tipo: TipoExtremo): void {
    if (!this.ruta()) {
      return;
    }

    this.cancelarModosMapa();
    this.modoDefinirExtremo.set(tipo);
  }

  cancelarModosMapa(): void {
    this.modoCrearPunto.set(false);
    this.modoMoverPunto.set(false);
    this.modoDefinirExtremo.set(null);
    this.modoMoverExtremo.set(null);
    this.pendienteCreacion.set(null);
    this.movimientoPendiente.set(null);
    this.actualizarMarcadoresPuntos(false);
  }

  cerrarModalRuta(): void {
    this.modalRutaAbierta.set(false);
  }

  cerrarModalPunto(): void {
    const eraEdicion = this.editandoPunto();
    this.modalPuntoAbierto.set(false);
    this.editandoPunto.set(false);
    this.pendienteCreacion.set(null);
    if (!eraEdicion) {
      this.modoCrearPunto.set(false);
    }
  }

  cerrarModalAsignar(): void {
    this.modalAsignarAbierto.set(false);
  }

  cerrarModalExtremo(): void {
    this.modalExtremoAbierto.set(false);
    this.editandoExtremo.set(false);
    this.pendienteCreacion.set(null);
    this.modoDefinirExtremo.set(null);
  }

  actualizarCampo(
    destino: 'nombrePunto' | 'referenciaPunto' | 'nombreRuta' | 'sectorRuta' | 'nombreExtremo' | 'referenciaExtremo',
    evento: Event,
  ): void {
    const valor = (evento.target as HTMLInputElement).value;
    this[destino].set(valor);
  }

  formatoCoord(valor: number | null | undefined): string {
    if (valor == null || Number.isNaN(valor)) {
      return '—';
    }

    return valor.toFixed(6);
  }

  abrirEditarExtremo(tipo: TipoExtremo): void {
    const extremo = tipo === 'origen' ? this.ruta()?.origen : this.ruta()?.destino;
    if (!extremo || extremo.latitud == null || extremo.longitud == null) {
      return;
    }

    this.modoDefinirExtremo.set(tipo);
    this.editandoExtremo.set(true);
    this.nombreExtremo.set(extremo.nombre);
    this.referenciaExtremo.set(extremo.referencia ?? '');
    this.pendienteCreacion.set({ lng: Number(extremo.longitud), lat: Number(extremo.latitud) });
    this.modalExtremoAbierto.set(true);
  }

  guardarExtremo(): void {
    const ruta = this.ruta();
    const tipo = this.modoDefinirExtremo();
    const pendiente = this.pendienteCreacion();
    const nombre = this.nombreExtremo().trim();
    if (!ruta || !tipo || !pendiente || !nombre || this.guardando()) {
      return;
    }

    const solicitud = {
      nombre,
      referencia: this.referenciaExtremo().trim() || null,
      latitud: pendiente.lat,
      longitud: pendiente.lng,
    };
    this.guardando.set(true);
    const peticion = tipo === 'origen'
      ? this.api.definirOrigen(ruta.idRuta, solicitud)
      : this.api.definirDestino(ruta.idRuta, solicitud);
    peticion.subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.modalExtremoAbierto.set(false);
        this.editandoExtremo.set(false);
        this.modoDefinirExtremo.set(null);
        this.pendienteCreacion.set(null);
        this.aplicarRuta(actualizada);
        this.feedback.mostrar(tipo === 'origen' ? 'Origen actualizado.' : 'Destino actualizado.');
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible guardar la ubicación.'));
      },
    });
  }

  activarMoverExtremo(tipo: TipoExtremo): void {
    const extremo = tipo === 'origen' ? this.ruta()?.origen : this.ruta()?.destino;
    if (!extremo || extremo.latitud == null || extremo.longitud == null) {
      return;
    }

    this.cancelarModosMapa();
    this.modoMoverExtremo.set(tipo);
    this.movimientoPendiente.set({ lng: Number(extremo.longitud), lat: Number(extremo.latitud) });
    this.actualizarMarcadoresPuntos(false);
  }

  guardarMovimientoExtremo(): void {
    const ruta = this.ruta();
    const tipo = this.modoMoverExtremo();
    const movimiento = this.movimientoPendiente();
    if (!ruta || !tipo || !movimiento || this.guardando()) {
      return;
    }

    const extremo = tipo === 'origen' ? ruta.origen : ruta.destino;
    if (!extremo) {
      return;
    }

    this.guardando.set(true);
    const solicitud = {
      nombre: extremo.nombre,
      referencia: extremo.referencia,
      latitud: movimiento.lat,
      longitud: movimiento.lng,
    };
    const peticion = tipo === 'origen'
      ? this.api.definirOrigen(ruta.idRuta, solicitud)
      : this.api.definirDestino(ruta.idRuta, solicitud);
    peticion.subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.modoMoverExtremo.set(null);
        this.movimientoPendiente.set(null);
        this.aplicarRuta(actualizada);
        this.feedback.mostrar('Ubicación actualizada.');
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible mover la ubicación.'));
      },
    });
  }

  calcularRuta(): void {
    const ruta = this.ruta();
    if (!ruta || !this.puedeCalcular()) {
      return;
    }

    this.calcularEnCurso.set(true);
    this.error.set(null);
    this.api.calcularTrazado(ruta.idRuta).subscribe({
      next: (actualizada) => {
        this.calcularEnCurso.set(false);
        this.aplicarRuta(actualizada, true);
        this.actualizarTrazadoMapa(actualizada.trazado);
        this.feedback.mostrar('Recorrido calculado.');
      },
      error: (err: unknown) => {
        this.calcularEnCurso.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible calcular el recorrido.'));
      },
    });
  }

  tituloModalExtremo(): string {
    const tipo = this.modoDefinirExtremo();
    if (this.editandoExtremo()) {
      return tipo === 'destino' ? 'Editar destino' : 'Editar origen';
    }

    return tipo === 'destino' ? 'Definir destino' : 'Definir origen';
  }

  guardarNuevoPunto(): void {
    const ruta = this.ruta();
    const pendiente = this.pendienteCreacion();
    const nombre = this.nombrePunto().trim();
    if (!ruta || !pendiente || !nombre || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.api.agregarPunto(ruta.idRuta, {
      nombre,
      referencia: this.referenciaPunto().trim() || null,
      ubicacion: { type: 'Point', coordinates: [pendiente.lng, pendiente.lat] },
    }).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.modalPuntoAbierto.set(false);
        this.modoCrearPunto.set(false);
        this.pendienteCreacion.set(null);
        this.aplicarRuta(actualizada);
        this.feedback.mostrar('Punto de recogida creado.');
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible crear el punto.'));
      },
    });
  }

  abrirEditarPunto(punto: PuntoRecogida): void {
    this.editandoPunto.set(true);
    this.puntoSeleccionadoId.set(punto.idPunto);
    this.nombrePunto.set(punto.nombre);
    this.referenciaPunto.set(punto.referencia ?? '');
    this.pendienteCreacion.set(
      punto.longitud != null && punto.latitud != null
        ? { lng: Number(punto.longitud), lat: Number(punto.latitud) }
        : null,
    );
    this.modalPuntoAbierto.set(true);
  }

  guardarEdicionPunto(): void {
    const ruta = this.ruta();
    const punto = this.puntoActual();
    const nombre = this.nombrePunto().trim();
    if (!ruta || !punto || !nombre || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.api.editarPunto(ruta.idRuta, punto.idPunto, {
      nombre,
      referencia: this.referenciaPunto().trim() || null,
      orden: punto.orden,
      ubicacion: this.ubicacionDe(punto),
    }).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.modalPuntoAbierto.set(false);
        this.editandoPunto.set(false);
        this.aplicarRuta(actualizada);
        this.feedback.mostrar('Punto actualizado.');
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible actualizar el punto.'));
      },
    });
  }

  activarMoverPunto(punto: PuntoRecogida): void {
    this.puntoSeleccionadoId.set(punto.idPunto);
    this.modoCrearPunto.set(false);
    this.modoMoverPunto.set(true);
    this.movimientoPendiente.set(
      punto.longitud != null && punto.latitud != null
        ? { lng: Number(punto.longitud), lat: Number(punto.latitud) }
        : null,
    );
    this.enfocarPunto(punto, false);
    this.actualizarMarcadoresPuntos(false);
  }

  guardarMovimiento(): void {
    const ruta = this.ruta();
    const punto = this.puntoActual();
    const movimiento = this.movimientoPendiente();
    if (!ruta || !punto || !movimiento || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.api.editarPunto(ruta.idRuta, punto.idPunto, {
      nombre: punto.nombre,
      referencia: punto.referencia,
      orden: punto.orden,
      ubicacion: this.ubicacionDe(punto, movimiento),
    }).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.modoMoverPunto.set(false);
        this.movimientoPendiente.set(null);
        this.aplicarRuta(actualizada);
        this.feedback.mostrar('Ubicación actualizada.');
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible mover el punto.'));
      },
    });
  }

  pedirEliminarPunto(punto: PuntoRecogida): void {
    this.puntoAEliminar.set(punto);
    this.tipoConfirmacion.set('eliminar');
    this.confirmacionAbierta.set(true);
  }

  cancelarConfirmacion(): void {
    this.confirmacionAbierta.set(false);
    this.puntoAEliminar.set(null);
  }

  abrirAsignar(punto: PuntoRecogida): void {
    this.puntoSeleccionadoId.set(punto.idPunto);
    this.idsAsignados.set(new Set(punto.pasajerosIds ?? []));
    this.busquedaAsignacion.set('');
    this.filtroModal.set('todos');
    this.modalAsignarAbierto.set(true);
  }

  toggleAsignado(idPasajero: number): void {
    this.idsAsignados.update((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(idPasajero)) {
        siguiente.delete(idPasajero);
      } else {
        siguiente.add(idPasajero);
      }

      return siguiente;
    });
  }

  guardarAsignacion(): void {
    const hayMovidos = this.pasajerosAMover().length > 0;
    if (hayMovidos) {
      this.tipoConfirmacion.set('mover');
      this.confirmacionAbierta.set(true);
      return;
    }

    this.persistirAsignacion();
  }

  soltarPunto(evento: CdkDragDrop<PuntoRecogida[]>): void {
    const ruta = this.ruta();
    if (!ruta || evento.previousIndex === evento.currentIndex || this.guardando()) {
      return;
    }

    const ordenados = [...this.puntosOrdenados()];
    moveItemInArray(ordenados, evento.previousIndex, evento.currentIndex);
    this.guardando.set(true);
    this.api.reordenarPuntos(ruta.idRuta, {
      puntos: ordenados.map((punto, indice) => ({ idPunto: punto.idPunto, orden: indice + 1 })),
    }).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.aplicarRuta(actualizada);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible reordenar los puntos.'));
      },
    });
  }

  pedirGeocodificarPendientes(): void {
    if (this.batchEnCurso() || this.pendientes() === 0 || !this.idEmpresa()) {
      return;
    }

    this.tipoConfirmacion.set('geo');
    this.confirmacionAbierta.set(true);
  }

  confirmarAccion(): void {
    const tipo = this.tipoConfirmacion();
    this.confirmacionAbierta.set(false);
    if (tipo === 'geo') {
      this.confirmarBatch();
      return;
    }

    if (tipo === 'eliminar') {
      this.eliminarPuntoConfirmado();
      return;
    }

    this.persistirAsignacion();
  }

  geocodificarUno(pasajero: PasajeroMapa): void {
    if (this.batchEnCurso() || this.idGeocodificando() === pasajero.idPasajero) {
      return;
    }

    this.idGeocodificando.set(pasajero.idPasajero);
    this.error.set(null);
    this.api.geocodificar(pasajero.idPasajero).subscribe({
      next: (actualizado) => {
        this.idGeocodificando.set(null);
        this.pasajeros.update((lista) =>
          lista.map((item) => (item.idPasajero === actualizado.idPasajero ? actualizado : item)),
        );
        this.actualizarMarcadoresPasajeros(false);
        this.seleccionadoId.set(actualizado.idPasajero);
        this.enfocarPasajero(actualizado, true);
      },
      error: (err: unknown) => {
        this.idGeocodificando.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible geocodificar esta dirección.'));
      },
    });
  }

  seleccionarPasajero(pasajero: PasajeroMapa): void {
    this.seleccionadoId.set(pasajero.idPasajero);
    if (pasajero.estadoGeocodificacion === 'GEOCODIFICADO') {
      this.enfocarPasajero(pasajero, true);
    }
  }

  verDomicilio(pasajero: PasajeroMapa): void {
    this.seleccionarPasajero(pasajero);
  }

  verPunto(pasajero: PasajeroMapa): void {
    const punto = this.asignacionPorPasajero().get(String(pasajero.idPasajero));
    if (punto) {
      this.enfocarPunto(punto, true);
    }
  }

  seleccionarPunto(punto: PuntoRecogida): void {
    this.puntoSeleccionadoId.set(punto.idPunto);
    this.enfocarPunto(punto, true);
  }

  etiquetaPunto(pasajero: PasajeroMapa): string {
    const punto = this.asignacionPorPasajero().get(String(pasajero.idPasajero));
    return punto ? `${punto.idPunto} · ${punto.nombre}` : 'Sin punto';
  }

  estaAsignado(idPasajero: number): boolean {
    return this.idsAsignados().has(idPasajero);
  }

  puntoDePasajero(idPasajero: number): PuntoRecogida | undefined {
    return this.asignacionPorPasajero().get(String(idPasajero));
  }

  private aplicarRuta(ruta: Ruta, ajustarVista = false): void {
    const normalizada = this.normalizarRuta(ruta);
    this.ruta.set(normalizada);
    this.rutas.update((lista) =>
      lista.some((item) => item.idRuta === normalizada.idRuta)
        ? lista.map((item) => (item.idRuta === normalizada.idRuta ? normalizada : item))
        : [...lista, normalizada],
    );
    this.actualizarMarcadoresPuntos(ajustarVista);
    this.actualizarTrazadoMapa(normalizada.trazado);
  }

  private ubicacionDe(punto: PuntoRecogida, override?: { lng: number; lat: number }): PuntoGeoJson {
    if (override) {
      return { type: 'Point', coordinates: [override.lng, override.lat] };
    }

    if (punto.ubicacion?.coordinates?.length === 2) {
      return punto.ubicacion;
    }

    return {
      type: 'Point',
      coordinates: [Number(punto.longitud), Number(punto.latitud)],
    };
  }

  private normalizarRuta(ruta: Ruta): Ruta {
    return {
      ...ruta,
      puntosRecogida: (ruta.puntosRecogida ?? []).map((punto) => ({
        ...punto,
        pasajerosIds: punto.pasajerosIds ?? [],
        cantidadPasajeros: punto.cantidadPasajeros ?? (punto.pasajerosIds ?? []).length,
      })),
    };
  }

  puntoActual(): PuntoRecogida | undefined {
    const id = this.puntoSeleccionadoId();
    return this.puntosOrdenados().find((punto) => punto.idPunto === id);
  }

  private pasajerosAMover(): number[] {
    const puntoId = this.puntoSeleccionadoId();
    const asignacion = this.asignacionPorPasajero();
    return [...this.idsAsignados()].filter((id) => {
      const actual = asignacion.get(String(id));
      return !!actual && actual.idPunto !== puntoId;
    });
  }

  private persistirAsignacion(): void {
    const ruta = this.ruta();
    const puntoId = this.puntoSeleccionadoId();
    if (!ruta || !puntoId || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.api.asignarPasajeros(ruta.idRuta, puntoId, {
      pasajerosIds: [...this.idsAsignados()],
    }).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.modalAsignarAbierto.set(false);
        this.aplicarRuta(actualizada);
        this.feedback.mostrar('Asignación actualizada.');
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible asignar los pasajeros.'));
      },
    });
  }

  private eliminarPuntoConfirmado(): void {
    const ruta = this.ruta();
    const punto = this.puntoAEliminar();
    if (!ruta || !punto || this.guardando()) {
      return;
    }

    this.borrarPunto(ruta.idRuta, punto.idPunto);
  }

  private borrarPunto(idRuta: string, idPunto: string, yaDesasociado = false): void {
    this.guardando.set(true);
    this.api.eliminarPunto(idRuta, idPunto).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.puntoAEliminar.set(null);
        this.puntoSeleccionadoId.set(null);
        this.aplicarRuta(actualizada);
        this.feedback.mostrar('Punto eliminado.');
      },
      error: (err: unknown) => {
        if (!yaDesasociado && this.esErrorDesasociar(err)) {
          this.api.asignarPasajeros(idRuta, idPunto, { pasajerosIds: [] }).subscribe({
            next: () => this.borrarPunto(idRuta, idPunto, true),
            error: (desasociarErr: unknown) => {
              this.guardando.set(false);
              this.error.set(mensajeErrorHttp(desasociarErr, 'No fue posible desasociar los pasajeros.'));
            },
          });
          return;
        }

        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible eliminar el punto.'));
      },
    });
  }

  private esErrorDesasociar(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    if (error.status !== 400) {
      return false;
    }

    const mensaje = mensajeErrorHttp(error, '').toLowerCase();
    return mensaje.includes('desasociar');
  }

  private confirmarBatch(): void {
    const idEmpresa = Number(this.idEmpresa());
    if (!Number.isInteger(idEmpresa) || idEmpresa < 1 || this.batchEnCurso()) {
      return;
    }

    this.batchEnCurso.set(true);
    this.error.set(null);
    this.api.geocodificarPendientes({ idEmpresa }).subscribe({
      next: (resultado) => {
        this.batchEnCurso.set(false);
        this.feedback.mostrar(
          `${resultado.geocodificados} direcciones geocodificadas. ${resultado.errores} requieren revisión.`,
        );
        this.cargarPasajeros();
      },
      error: (err: unknown) => {
        this.batchEnCurso.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible geocodificar las direcciones pendientes.'));
      },
    });
  }

  private inicializarMapa(): void {
    const contenedor = this.contenedorMapa()?.nativeElement;
    if (!contenedor || this.mapa) {
      return;
    }

    configurarWorkerMapLibre();
    this.mapa = new MapaLibre({
      container: contenedor,
      style: ESTILO_MAPA_BASE,
      center: CENTRO_PUERTO_MONTT,
      zoom: ZOOM_CIUDAD,
    });
    this.mapa.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    this.mapa.on('click', this.manejarClickMapa);
    this.mapa.on('load', () => {
      this.zona.run(() => {
        this.actualizarMarcadoresPasajeros(true);
        this.actualizarMarcadoresPuntos(true);
        this.actualizarTrazadoMapa(this.ruta()?.trazado ?? null);
      });
    });
  }

  private alClickMapa(evento: MapMouseEvent): void {
    if (!this.ruta() || this.modalPuntoAbierto() || this.modalExtremoAbierto()) {
      return;
    }

    const tipo = this.modoDefinirExtremo();
    if (tipo) {
      const extremo = tipo === 'origen' ? this.ruta()?.origen : this.ruta()?.destino;
      this.pendienteCreacion.set({ lng: evento.lngLat.lng, lat: evento.lngLat.lat });
      this.editandoExtremo.set(false);
      this.nombreExtremo.set(extremo?.nombre ?? '');
      this.referenciaExtremo.set(extremo?.referencia ?? '');
      this.modalExtremoAbierto.set(true);
      return;
    }

    if (!this.modoCrearPunto()) {
      return;
    }

    this.pendienteCreacion.set({ lng: evento.lngLat.lng, lat: evento.lngLat.lat });
    this.editandoPunto.set(false);
    this.nombrePunto.set('');
    this.referenciaPunto.set('');
    this.modalPuntoAbierto.set(true);
  }

  private actualizarMarcadoresPasajeros(ajustarVista: boolean): void {
    const mapa = this.mapa;
    if (!mapa) {
      return;
    }

    this.limpiarMarcadoresPasajeros();
    const puntos: [number, number][] = [];
    for (const pasajero of this.pasajeros()) {
      if (pasajero.latitud == null || pasajero.longitud == null) {
        continue;
      }

      const lngLat: [number, number] = [Number(pasajero.longitud), Number(pasajero.latitud)];
      puntos.push(lngLat);
      const marcador = new Marker({ color: '#64748b', scale: 0.75 })
        .setLngLat(lngLat)
        .setPopup(new Popup({ offset: 16 }).setDOMContent(this.crearPopupPasajero(pasajero)))
        .addTo(mapa);
      this.marcadoresPasajeros.set(pasajero.idPasajero, marcador);
    }

    if (ajustarVista && !(this.ruta()?.puntosRecogida ?? []).length) {
      this.ajustarVista(puntos);
    }
  }

  private actualizarMarcadoresPuntos(ajustarVista: boolean): void {
    const mapa = this.mapa;
    if (!mapa) {
      return;
    }

    this.limpiarMarcadoresPuntos();
    const extras: [number, number][] = [];
    for (const punto of this.puntosOrdenados()) {
      if (punto.latitud == null || punto.longitud == null) {
        continue;
      }

      const lngLat: [number, number] = [Number(punto.longitud), Number(punto.latitud)];
      extras.push(lngLat);
      const elemento = document.createElement('div');
      elemento.className = 'marcador-punto';
      elemento.textContent = String(punto.orden);
      const marcador = new Marker({ element: elemento, draggable: this.modoMoverPunto() && this.puntoSeleccionadoId() === punto.idPunto })
        .setLngLat(lngLat)
        .setPopup(new Popup({ offset: 18 }).setDOMContent(this.crearPopupPunto(punto)))
        .addTo(mapa);

      if (this.modoMoverPunto() && this.puntoSeleccionadoId() === punto.idPunto) {
        marcador.on('dragend', () => {
          const pos = marcador.getLngLat();
          this.zona.run(() => this.movimientoPendiente.set({ lng: pos.lng, lat: pos.lat }));
        });
      }

      this.marcadoresPuntos.set(punto.idPunto, marcador);
    }

    this.marcadorOrigen = this.crearMarcadorExtremo('origen', this.ruta()?.origen ?? null);
    this.marcadorDestino = this.crearMarcadorExtremo('destino', this.ruta()?.destino ?? null);
    const origen = this.lngLatDe(this.ruta()?.origen);
    const destino = this.lngLatDe(this.ruta()?.destino);
    if (origen) {
      extras.push(origen);
    }

    if (destino) {
      extras.push(destino);
    }

    if (ajustarVista) {
      const linea = (this.ruta()?.trazado?.coordinates ?? [])
        .filter((pos) => pos.length >= 2)
        .map((pos): [number, number] => [pos[0], pos[1]]);
      const pasajeros: [number, number][] = this.pasajeros()
        .filter((p) => p.latitud != null && p.longitud != null)
        .map((p) => [Number(p.longitud), Number(p.latitud)]);
      this.ajustarVista(linea.length > 1 ? linea : [...pasajeros, ...extras]);
    }

    this.actualizarTrazadoMapa(this.ruta()?.trazado ?? null);
  }

  private crearMarcadorExtremo(tipo: TipoExtremo, extremo: ExtremoRuta | null): Marker | null {
    const mapa = this.mapa;
    const lngLat = this.lngLatDe(extremo);
    if (!mapa || !extremo || !lngLat) {
      return null;
    }

    const elemento = document.createElement('div');
    elemento.className = tipo === 'origen' ? 'marcador-origen' : 'marcador-destino';
    elemento.textContent = tipo === 'origen' ? 'O' : 'D';
    const draggable = this.modoMoverExtremo() === tipo;
    const marcador = new Marker({ element: elemento, draggable })
      .setLngLat(lngLat)
      .setPopup(new Popup({ offset: 18 }).setDOMContent(this.crearPopupExtremo(tipo, extremo)))
      .addTo(mapa);
    if (draggable) {
      marcador.on('dragend', () => {
        const pos = marcador.getLngLat();
        this.zona.run(() => this.movimientoPendiente.set({ lng: pos.lng, lat: pos.lat }));
      });
    }

    return marcador;
  }

  private crearPopupExtremo(tipo: TipoExtremo, extremo: ExtremoRuta): HTMLElement {
    const contenedor = document.createElement('div');
    contenedor.className = 'mapa-popup';
    const titulo = document.createElement('strong');
    titulo.textContent = tipo === 'origen' ? 'Origen' : 'Destino';
    contenedor.appendChild(titulo);
    const nombre = document.createElement('p');
    nombre.textContent = extremo.nombre;
    contenedor.appendChild(nombre);
    if (extremo.referencia) {
      const referencia = document.createElement('p');
      referencia.textContent = extremo.referencia;
      contenedor.appendChild(referencia);
    }

    return contenedor;
  }

  private lngLatDe(extremo: ExtremoRuta | null | undefined): [number, number] | null {
    if (extremo?.longitud == null || extremo.latitud == null) {
      return null;
    }

    return [Number(extremo.longitud), Number(extremo.latitud)];
  }

  private actualizarTrazadoMapa(trazado: LineaGeoJson | null): void {
    const mapa = this.mapa;
    if (!mapa) {
      return;
    }

    const aplicar = (): void => {
      try {
        this.dibujarTrazadoEnMapa(mapa, trazado);
      } catch {
        mapa.once('styledata', () => this.dibujarTrazadoEnMapa(mapa, trazado));
      }
    };

    aplicar();
  }

  private dibujarTrazadoEnMapa(mapa: MapaLibre, trazado: LineaGeoJson | null): void {
    const coordinates = (trazado?.coordinates ?? [])
      .map((pos): [number, number] => [Number(pos[0]), Number(pos[1])])
      .filter((pos) => Number.isFinite(pos[0]) && Number.isFinite(pos[1]));

    if (!trazado || coordinates.length < 2) {
      if (mapa.getLayer(LAYER_TRAZADO)) {
        mapa.removeLayer(LAYER_TRAZADO);
      }

      if (mapa.getSource(SOURCE_TRAZADO)) {
        mapa.removeSource(SOURCE_TRAZADO);
      }

      return;
    }

    const feature = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates,
      },
    };

    const fuente = mapa.getSource(SOURCE_TRAZADO) as GeoJSONSource | undefined;
    if (fuente) {
      fuente.setData(feature);
    } else {
      mapa.addSource(SOURCE_TRAZADO, {
        type: 'geojson',
        data: feature,
      });
    }

    if (!mapa.getLayer(LAYER_TRAZADO)) {
      mapa.addLayer({
        id: LAYER_TRAZADO,
        type: 'line',
        source: SOURCE_TRAZADO,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 5,
          'line-opacity': 0.95,
        },
      });
    }

    if (mapa.getLayer(LAYER_TRAZADO)) {
      mapa.moveLayer(LAYER_TRAZADO);
    }
  }

  private ajustarVista(puntos: [number, number][]): void {
    const mapa = this.mapa;
    if (!mapa) {
      return;
    }

    if (puntos.length === 0) {
      mapa.flyTo({ center: CENTRO_PUERTO_MONTT, zoom: ZOOM_CIUDAD });
      return;
    }

    if (puntos.length === 1) {
      mapa.flyTo({ center: puntos[0], zoom: ZOOM_PASAJERO });
      return;
    }

    const bounds = new LngLatBounds(puntos[0], puntos[0]);
    for (const punto of puntos) {
      bounds.extend(punto);
    }

    mapa.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 800 });
  }

  private enfocarPasajero(pasajero: PasajeroMapa, abrirPopup: boolean): void {
    if (pasajero.latitud == null || pasajero.longitud == null) {
      return;
    }

    const marcador = this.marcadoresPasajeros.get(pasajero.idPasajero);
    this.mapa?.flyTo({
      center: [Number(pasajero.longitud), Number(pasajero.latitud)],
      zoom: ZOOM_PASAJERO,
    });
    if (abrirPopup && marcador) {
      const popup = marcador.getPopup();
      if (popup && !popup.isOpen()) {
        marcador.togglePopup();
      }
    }
  }

  private enfocarPunto(punto: PuntoRecogida, abrirPopup: boolean): void {
    if (punto.latitud == null || punto.longitud == null) {
      return;
    }

    this.puntoSeleccionadoId.set(punto.idPunto);
    const marcador = this.marcadoresPuntos.get(punto.idPunto);
    this.mapa?.flyTo({
      center: [Number(punto.longitud), Number(punto.latitud)],
      zoom: ZOOM_PASAJERO,
    });
    if (abrirPopup && marcador) {
      const popup = marcador.getPopup();
      if (popup && !popup.isOpen()) {
        marcador.togglePopup();
      }
    }
  }

  private crearPopupPasajero(pasajero: PasajeroMapa): HTMLElement {
    const contenedor = document.createElement('div');
    contenedor.className = 'mapa-popup';
    const nombre = document.createElement('strong');
    nombre.textContent = pasajero.nombre;
    contenedor.appendChild(nombre);
    const direccion = document.createElement('p');
    direccion.textContent = pasajero.direccion;
    contenedor.appendChild(direccion);
    if (pasajero.rut) {
      const rut = document.createElement('p');
      rut.textContent = pasajero.rut;
      contenedor.appendChild(rut);
    }

    if (
      pasajero.direccionGeocodificada
      && pasajero.direccionGeocodificada.trim().toLowerCase() !== pasajero.direccion.trim().toLowerCase()
    ) {
      const etiqueta = document.createElement('p');
      etiqueta.className = 'mapa-popup-label';
      etiqueta.textContent = 'Ubicación encontrada:';
      contenedor.appendChild(etiqueta);
      const encontrada = document.createElement('p');
      encontrada.textContent = pasajero.direccionGeocodificada;
      contenedor.appendChild(encontrada);
    }

    return contenedor;
  }

  private crearPopupPunto(punto: PuntoRecogida): HTMLElement {
    const contenedor = document.createElement('div');
    contenedor.className = 'mapa-popup';
    const id = document.createElement('strong');
    id.textContent = punto.idPunto;
    contenedor.appendChild(id);
    const nombre = document.createElement('p');
    nombre.textContent = punto.nombre;
    contenedor.appendChild(nombre);
    if (punto.referencia) {
      const referencia = document.createElement('p');
      referencia.textContent = punto.referencia;
      contenedor.appendChild(referencia);
    }

    const orden = document.createElement('p');
    orden.textContent = `Orden: ${punto.orden}`;
    contenedor.appendChild(orden);
    const pasajeros = document.createElement('p');
    pasajeros.textContent = `Pasajeros: ${punto.cantidadPasajeros ?? (punto.pasajerosIds ?? []).length}`;
    contenedor.appendChild(pasajeros);

    const acciones = document.createElement('div');
    acciones.className = 'mapa-popup-acciones';
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.textContent = 'Editar';
    editar.addEventListener('click', (evento) => {
      evento.preventDefault();
      this.zona.run(() => this.abrirEditarPunto(punto));
    });
    const asignar = document.createElement('button');
    asignar.type = 'button';
    asignar.textContent = 'Asignar pasajeros';
    asignar.addEventListener('click', (evento) => {
      evento.preventDefault();
      this.zona.run(() => this.abrirAsignar(punto));
    });
    acciones.append(editar, asignar);
    contenedor.appendChild(acciones);
    return contenedor;
  }

  private limpiarMarcadoresPasajeros(): void {
    for (const marcador of this.marcadoresPasajeros.values()) {
      marcador.remove();
    }
    this.marcadoresPasajeros.clear();
  }

  private limpiarMarcadoresPuntos(): void {
    for (const marcador of this.marcadoresPuntos.values()) {
      marcador.remove();
    }
    this.marcadoresPuntos.clear();
    this.marcadorOrigen?.remove();
    this.marcadorDestino?.remove();
    this.marcadorOrigen = null;
    this.marcadorDestino = null;
  }
}
