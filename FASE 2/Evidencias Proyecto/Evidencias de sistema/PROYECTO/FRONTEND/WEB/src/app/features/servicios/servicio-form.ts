import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { catchError, EMPTY, forkJoin, of, Subject, switchMap, tap } from 'rxjs';
import { Conductor } from '../../core/models/conductor';
import { Empresa } from '../../core/models/empresa';
import { Pasajero } from '../../core/models/pasajero';
import { Planificacion } from '../../core/models/planificacion';
import { PuntoRecogida, Ruta } from '../../core/models/ruta';
import {
  AltaServicio,
  DiaSemana,
  ModalidadServicio,
  PasajeroServicioInicial,
  TipoServicio,
} from '../../core/models/servicio';
import { Vehiculo } from '../../core/models/vehiculo';
import { ConductoresService } from '../../core/services/conductores.service';
import { EmpresasService } from '../../core/services/empresas.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { PlanificacionesService } from '../../core/services/planificaciones.service';
import { RutasService } from '../../core/services/rutas.service';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { formatearIso, hoyLocal, parsearIso } from '../../core/utils/fechas';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { SearchInput } from '../../shared/components/search-input/search-input';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';

const DIAS: { value: DiaSemana; label: string }[] = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
];

interface CandidatoPasajeroServicio {
  idPasajero: number;
  nombre: string;
  rut: string;
  telefono: string;
  habitual: boolean;
  idPuntoHabitual: string | null;
  seleccionado: boolean;
  idPuntoRecogida: string;
}

@Component({
  selector: 'app-servicio-form',
  imports: [ReactiveFormsModule, ActionButton, SearchInput, StatusBadge],
  templateUrl: './servicio-form.html',
  styleUrl: './servicio-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioForm {
  readonly abierto = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly idEmpresaInicial = input('');
  readonly empresaNombre = input('');
  readonly soloAsignacion = input(false);
  readonly fase = input<'crear' | 'asignar' | ''>('');
  readonly avisoAbandono = input(false);
  readonly progreso = input('');
  readonly guardado = output<AltaServicio>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly empresasApi = inject(EmpresasService);
  private readonly planificacionesApi = inject(PlanificacionesService);
  private readonly rutasApi = inject(RutasService);
  private readonly pasajerosApi = inject(PasajerosService);
  private readonly conductoresApi = inject(ConductoresService);
  private readonly vehiculosApi = inject(VehiculosService);
  private readonly recargaPasajeros = new Subject<string>();

  readonly diasSemana = DIAS;
  readonly tipos: TipoServicio[] = ['IDA', 'REGRESO', 'ESPECIAL'];
  readonly esqueletosPasajeros = [1, 2, 3];

  readonly empresas = signal<Empresa[]>([]);
  readonly conductores = signal<Conductor[]>([]);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly idVehiculoActual = signal('');
  readonly fechaDesdeActual = signal('');
  readonly fechaHastaActual = signal('');
  private readonly seleccionPasajeros = new Map<number, { seleccionado: boolean; idPuntoRecogida: string }>();
  private rutaPasajerosCargada = '';
  readonly planificaciones = signal<Planificacion[]>([]);
  readonly rutas = signal<Ruta[]>([]);
  readonly cargandoPlanificaciones = signal(false);
  readonly cargandoRutas = signal(false);
  readonly idEmpresaActual = signal('');
  readonly idPlanificacionActual = signal('');
  readonly idRutaActual = signal('');
  readonly modalidadActual = signal<ModalidadServicio>('individual');
  readonly diasSeleccionados = signal<DiaSemana[]>([]);

  readonly puntosRuta = signal<PuntoRecogida[]>([]);
  readonly candidatos = signal<CandidatoPasajeroServicio[]>([]);
  readonly busquedaPasajeros = signal('');
  readonly cargandoPasajeros = signal(false);
  readonly errorPasajeros = signal<string | null>(null);
  readonly errorSeleccionPasajeros = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      modalidad: this.fb.nonNullable.control<ModalidadServicio>('individual'),
      idEmpresa: ['', Validators.required],
      idPlanificacion: ['', Validators.required],
      idRuta: ['', Validators.required],
      idConductor: ['', Validators.required],
      idVehiculo: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required],
      tipoServicio: ['', Validators.required],
      fecha: [''],
      fechaDesde: [''],
      fechaHasta: [''],
      diasSemana: this.fb.nonNullable.control<DiaSemana[]>([]),
    },
    { validators: [horaFinPosterior, rangoFechasRecurrente] },
  );

  readonly esRecurrente = computed(() => this.modalidadActual() === 'recurrente');
  readonly mostrarPasajeros = computed(() => !!this.idEmpresaActual() && !!this.idRutaActual());

  readonly planificacionSeleccionada = computed(() => {
    const id = Number(this.idPlanificacionActual());
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    return this.planificaciones().find((item) => item.idPlanificacion === id) ?? null;
  });

  readonly sinDiasEnPeriodo = computed(() => {
    const periodo = this.planificacionSeleccionada()?.periodo;
    if (!periodo) {
      return false;
    }

    return formatearIso(hoyLocal()) > ultimoDiaPeriodo(periodo);
  });

  readonly fechaMinima = computed(() => {
    const hoy = formatearIso(hoyLocal());
    const periodo = this.planificacionSeleccionada()?.periodo;
    if (!periodo) {
      return hoy;
    }

    const inicio = `${periodo}-01`;
    const fin = ultimoDiaPeriodo(periodo);
    if (hoy > fin) {
      return inicio;
    }

    return hoy > inicio ? hoy : inicio;
  });

  readonly fechaMaxima = computed(() => {
    const periodo = this.planificacionSeleccionada()?.periodo;
    return periodo ? ultimoDiaPeriodo(periodo) : '';
  });

  readonly etiquetaGuardar = computed(() => {
    if (this.guardando()) {
      return this.fase() === 'asignar' ? 'Asignando...' : 'Creando...';
    }

    if (this.soloAsignacion()) {
      return 'Reintentar asignación';
    }

    return this.modalidadActual() === 'recurrente' ? 'Crear serie' : 'Crear servicio';
  });

  readonly vehiculoSeleccionado = computed(
    () => this.vehiculos().find((item) => String(item.idVehiculo) === this.idVehiculoActual()) ?? null,
  );

  readonly detalleVehiculo = computed(() => {
    const vehiculo = this.vehiculoSeleccionado();
    if (!vehiculo) {
      return '';
    }

    return `${vehiculo.patente} · ${vehiculo.tipo} ${vehiculo.marca} ${vehiculo.modelo} · Capacidad ${vehiculo.capacidad}`;
  });

  readonly avisoPlanificacion = computed(() => {
    const periodo = this.planificacionSeleccionada()?.periodo;
    if (!periodo) {
      return null;
    }

    const mes = etiquetaMesPeriodo(periodo);
    if (this.sinDiasEnPeriodo()) {
      return `La planificación de ${mes} ya no tiene fechas disponibles a partir de hoy. No es posible crear servicios en ese mes.`;
    }

    return `Planificación: ${mes}. Solo puedes programar servicios dentro de este mes.`;
  });

  readonly fechasSerie = computed(() => {
    if (this.modalidadActual() !== 'recurrente') {
      return null;
    }

    return fechasDeSerie(
      this.fechaDesdeActual(),
      this.fechaHastaActual(),
      this.diasSeleccionados(),
      this.planificacionSeleccionada()?.periodo ?? '',
      formatearIso(hoyLocal()),
    );
  });

  readonly sinCoincidencias = computed(() => this.fechasSerie()?.length === 0);

  readonly avisoSerie = computed(() => {
    const fechas = this.fechasSerie();
    if (!fechas) {
      return null;
    }

    if (fechas.length === 0) {
      return 'No hay fechas que coincidan con los días seleccionados';
    }

    return `Se generarán ${fechas.length} servicios`;
  });

  readonly excedeCapacidad = computed(() => {
    const capacidad = this.vehiculoSeleccionado()?.capacidad;
    if (typeof capacidad !== 'number') {
      return false;
    }

    return this.cantidadSeleccionados() > capacidad;
  });

  readonly cantidadSeleccionados = computed(
    () => this.candidatos().filter((item) => item.seleccionado).length,
  );

  readonly hayHabituales = computed(() => this.candidatos().some((item) => item.habitual));

  readonly habitualesVisibles = computed(() =>
    this.candidatos().filter((item) => item.habitual && coincideCandidato(item, this.busquedaPasajeros())),
  );

  readonly otrosVisibles = computed(() =>
    this.candidatos().filter((item) => !item.habitual && coincideCandidato(item, this.busquedaPasajeros())),
  );

  constructor() {
    this.form.controls.idPlanificacion.disable({ emitEvent: false });
    this.form.controls.idRuta.disable({ emitEvent: false });
    this.cargarConductoresYVehiculos();

    this.form.controls.idVehiculo.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      this.idVehiculoActual.set(id);
    });

    effect(() => {
      if (!this.soloAsignacion()) {
        return;
      }

      untracked(() => this.bloquearProgramacion());
    });

    effect(() => {
      const sinDias = this.sinDiasEnPeriodo();
      const soloAsignacion = this.soloAsignacion();
      untracked(() => this.ajustarFechasDisponibles(sinDias, soloAsignacion));
    });

    this.form.controls.modalidad.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((modalidad) => {
      this.modalidadActual.set(modalidad);
      this.conservarFechas(modalidad);
      this.actualizarValidadoresFecha();
    });

    for (const control of [
      this.form.controls.fecha,
      this.form.controls.fechaDesde,
      this.form.controls.fechaHasta,
    ]) {
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.sincronizarFechas());
    }

    this.form.controls.idEmpresa.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((idEmpresa) => {
          this.idEmpresaActual.set(idEmpresa);
          this.form.controls.idPlanificacion.setValue('', { emitEvent: false });
          this.form.controls.idRuta.setValue('', { emitEvent: false });
          this.idPlanificacionActual.set('');
          this.idRutaActual.set('');
          this.planificaciones.set([]);
          this.rutas.set([]);
          this.cargandoRutas.set(false);
          this.recargaPasajeros.next('');
        }),
        switchMap((idEmpresa) => {
          const id = Number(idEmpresa);
          if (!Number.isInteger(id) || id <= 0) {
            this.cargandoPlanificaciones.set(false);
            this.form.controls.idPlanificacion.disable({ emitEvent: false });
            this.form.controls.idRuta.disable({ emitEvent: false });
            return EMPTY;
          }

          this.form.controls.idPlanificacion.enable({ emitEvent: false });
          this.form.controls.idRuta.disable({ emitEvent: false });
          this.cargandoPlanificaciones.set(true);
          return this.planificacionesApi.listar({ idEmpresa: id }).pipe(
            catchError(() => of([] as Planificacion[])),
          );
        }),
      )
      .subscribe((planificaciones) => {
        this.planificaciones.set(
          planificaciones.filter((item) => item.estado === 'BORRADOR' || item.estado === 'ACTIVA'),
        );
        this.cargandoPlanificaciones.set(false);
      });

    this.form.controls.idPlanificacion.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((id) => {
          this.idPlanificacionActual.set(id);
          const idPlanificacion = Number(id);
          if (!Number.isInteger(idPlanificacion) || idPlanificacion <= 0) {
            this.form.controls.idRuta.disable({ emitEvent: false });
          }
          this.actualizarValidadoresFecha();
        }),
        switchMap((id) => {
          const idPlanificacion = Number(id);
          const idEmpresa = Number(this.form.controls.idEmpresa.value);
          if (
            !Number.isInteger(idPlanificacion)
            || idPlanificacion <= 0
            || !Number.isInteger(idEmpresa)
            || idEmpresa <= 0
          ) {
            this.cargandoRutas.set(false);
            this.form.controls.idRuta.disable({ emitEvent: false });
            return EMPTY;
          }

          this.form.controls.idRuta.enable({ emitEvent: false });
          this.cargandoRutas.set(true);
          return this.rutasApi.listar(idEmpresa, 'ACTIVO').pipe(catchError(() => of([] as Ruta[])));
        }),
      )
      .subscribe((rutas) => {
        this.rutas.set(rutas);
        this.cargandoRutas.set(false);
        const actual = this.form.controls.idRuta.value;
        if (actual && !rutas.some((ruta) => ruta.idRuta === actual)) {
          this.form.controls.idRuta.setValue('');
        }
      });

    this.form.controls.idRuta.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((idRuta) => {
      this.idRutaActual.set(idRuta);
      this.recargaPasajeros.next(idRuta);
    });

    this.recargaPasajeros
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((idRuta) => {
          const mismaRuta = !!idRuta && idRuta === this.rutaPasajerosCargada;
          if (!mismaRuta) {
            this.seleccionPasajeros.clear();
          } else if (this.candidatos().length > 0) {
            this.seleccionPasajeros.clear();
            for (const item of this.candidatos()) {
              this.seleccionPasajeros.set(item.idPasajero, {
                seleccionado: item.seleccionado,
                idPuntoRecogida: item.idPuntoRecogida,
              });
            }
          }
          this.rutaPasajerosCargada = idRuta;
          this.reiniciarPasajeros();
        }),
        switchMap((idRuta) => this.obtenerPasajeros$(idRuta)),
      )
      .subscribe((datos) => this.aplicarPasajeros(datos));

    this.actualizarValidadoresFecha();

    effect(() => {
      if (!this.abierto()) {
        return;
      }

      untracked(() => this.reiniciar());
    });
  }

  alternarDia(dia: DiaSemana): void {
    const actuales = this.form.controls.diasSemana.value;
    const siguiente = actuales.includes(dia)
      ? actuales.filter((item) => item !== dia)
      : [...actuales, dia];
    this.form.controls.diasSemana.setValue(siguiente);
    this.diasSeleccionados.set(siguiente);
    this.form.controls.diasSemana.markAsTouched();
  }

  diaSeleccionado(dia: DiaSemana): boolean {
    return this.diasSeleccionados().includes(dia);
  }

  etiquetaPunto(punto: PuntoRecogida): string {
    return `${punto.orden} · ${punto.nombre}`;
  }

  alternarPasajero(idPasajero: number): void {
    this.errorSeleccionPasajeros.set(null);
    this.candidatos.update((lista) =>
      lista.map((item) =>
        item.idPasajero === idPasajero ? { ...item, seleccionado: !item.seleccionado } : item,
      ),
    );
  }

  cambiarPunto(idPasajero: number, idPuntoRecogida: string): void {
    this.errorSeleccionPasajeros.set(null);
    this.candidatos.update((lista) =>
      lista.map((item) => (item.idPasajero === idPasajero ? { ...item, idPuntoRecogida } : item)),
    );
  }

  puntoDesdeEvento(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  seleccionarHabituales(): void {
    this.errorSeleccionPasajeros.set(null);
    this.candidatos.update((lista) =>
      lista.map((item) =>
        item.habitual
          ? {
              ...item,
              seleccionado: true,
              idPuntoRecogida: item.idPuntoRecogida || item.idPuntoHabitual || '',
            }
          : item,
      ),
    );
  }

  quitarTodos(): void {
    this.errorSeleccionPasajeros.set(null);
    this.candidatos.update((lista) => lista.map((item) => ({ ...item, seleccionado: false })));
  }

  reintentarPasajeros(): void {
    this.recargaPasajeros.next(this.form.controls.idRuta.value);
  }

  enviar(): void {
    if (
      this.guardando()
      || (!this.soloAsignacion() && (this.sinDiasEnPeriodo() || this.sinCoincidencias() || this.excedeCapacidad()))
    ) {
      return;
    }

    this.actualizarValidadoresFecha();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const pasajeros = this.soloAsignacion() ? [] : this.pasajerosParaEnvio();
    if (pasajeros === null) {
      return;
    }

    const valores = this.form.getRawValue();
    const idConductor = Number(valores.idConductor);
    const idVehiculo = Number(valores.idVehiculo);
    if (!Number.isInteger(idConductor) || idConductor <= 0 || !Number.isInteger(idVehiculo) || idVehiculo <= 0) {
      this.form.controls.idConductor.markAsTouched();
      this.form.controls.idVehiculo.markAsTouched();
      return;
    }
    const horaInicio = aHoraApi(valores.horaInicio);
    const horaFin = aHoraApi(valores.horaFin);
    const tipoServicio = valores.tipoServicio as TipoServicio;

    if (valores.modalidad === 'individual') {
      this.guardado.emit({
        modalidad: 'individual',
        solicitud: {
          idEmpresa: Number(valores.idEmpresa),
          idPlanificacion: Number(valores.idPlanificacion),
          idRuta: valores.idRuta,
          fecha: valores.fecha,
          horaInicio,
          horaFin,
          tipoServicio,
        },
        pasajeros,
        idConductor,
        idVehiculo,
      });
      return;
    }

    this.guardado.emit({
      modalidad: 'recurrente',
      solicitud: {
        idEmpresa: Number(valores.idEmpresa),
        idPlanificacion: Number(valores.idPlanificacion),
        idRuta: valores.idRuta,
        fechaDesde: valores.fechaDesde,
        fechaHasta: valores.fechaHasta,
        diasSemana: valores.diasSemana,
        horaInicio,
        horaFin,
        tipoServicio,
        pasajeros,
      },
      idConductor,
      idVehiculo,
    });
  }

  mensajeCampo(
    control:
      | 'idEmpresa'
      | 'idPlanificacion'
      | 'idRuta'
      | 'idConductor'
      | 'idVehiculo'
      | 'horaInicio'
      | 'horaFin'
      | 'tipoServicio'
      | 'fecha'
      | 'fechaDesde'
      | 'fechaHasta'
      | 'diasSemana',
  ): string | null {
    if (control === 'horaFin' && this.form.hasError('horarioInvalido') && this.form.controls.horaFin.touched) {
      return 'La hora de fin debe ser posterior a la hora de inicio.';
    }

    if (
      (control === 'fechaDesde' || control === 'fechaHasta')
      && this.form.hasError('rangoFechas')
      && (this.form.controls.fechaDesde.touched || this.form.controls.fechaHasta.touched)
    ) {
      return 'La fecha inicial no puede ser posterior a la fecha final.';
    }

    const campo = this.form.controls[control];
    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo.hasError('fechaAnterior')) {
      return 'La fecha no puede ser anterior al día actual.';
    }

    if (campo.hasError('fueraDePeriodo')) {
      return 'La fecha debe pertenecer al mes de la planificación.';
    }

    if (campo.hasError('diasVacios')) {
      return 'Selecciona al menos un día de la semana.';
    }

    return 'Dato inválido.';
  }

  filaSinPunto(candidato: CandidatoPasajeroServicio): boolean {
    return candidato.seleccionado && !candidato.idPuntoRecogida && !!this.errorSeleccionPasajeros();
  }

  private pasajerosParaEnvio(): PasajeroServicioInicial[] | null {
    const idsPuntos = new Set(this.puntosRuta().map((punto) => punto.idPunto));
    const seleccionados = this.candidatos().filter((item) => item.seleccionado);

    if (seleccionados.some((item) => !item.idPuntoRecogida)) {
      this.errorSeleccionPasajeros.set('Cada pasajero seleccionado debe tener un punto de recogida.');
      return null;
    }

    if (seleccionados.some((item) => !idsPuntos.has(item.idPuntoRecogida))) {
      this.errorSeleccionPasajeros.set('El punto de recogida debe pertenecer a la ruta seleccionada.');
      return null;
    }

    this.errorSeleccionPasajeros.set(null);
    return seleccionados.map((item) => ({
      idPasajero: item.idPasajero,
      idPuntoRecogida: item.idPuntoRecogida,
    }));
  }

  private bloquearProgramacion(): void {
    this.form.controls.modalidad.disable({ emitEvent: false });
    this.form.controls.idEmpresa.disable({ emitEvent: false });
    this.form.controls.idPlanificacion.disable({ emitEvent: false });
    this.form.controls.idRuta.disable({ emitEvent: false });
    this.form.controls.horaInicio.disable({ emitEvent: false });
    this.form.controls.horaFin.disable({ emitEvent: false });
    this.form.controls.tipoServicio.disable({ emitEvent: false });
    this.form.controls.fecha.disable({ emitEvent: false });
    this.form.controls.fechaDesde.disable({ emitEvent: false });
    this.form.controls.fechaHasta.disable({ emitEvent: false });
    this.form.controls.diasSemana.disable({ emitEvent: false });
    this.form.controls.idConductor.enable({ emitEvent: false });
    this.form.controls.idVehiculo.enable({ emitEvent: false });
  }

  private cargarConductoresYVehiculos(): void {
    this.conductoresApi.listar('ACTIVO').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => this.conductores.set(lista),
      error: () => this.conductores.set([]),
    });
    this.vehiculosApi.listar('ACTIVO').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => this.vehiculos.set(lista),
      error: () => this.vehiculos.set([]),
    });
  }

  private reiniciar(): void {
    const empresa = this.idEmpresaInicial();
    this.form.reset(
      {
        modalidad: 'individual',
        idEmpresa: empresa,
        idPlanificacion: '',
        idRuta: '',
        idConductor: '',
        idVehiculo: '',
        horaInicio: '',
        horaFin: '',
        tipoServicio: '',
        fecha: '',
        fechaDesde: '',
        fechaHasta: '',
        diasSemana: [],
      },
      { emitEvent: false },
    );
    this.idEmpresaActual.set(empresa);
    this.idPlanificacionActual.set('');
    this.idRutaActual.set('');
    this.idVehiculoActual.set('');
    this.modalidadActual.set('individual');
    this.diasSeleccionados.set([]);
    this.planificaciones.set([]);
    this.rutas.set([]);
    this.cargandoPlanificaciones.set(false);
    this.cargandoRutas.set(false);
    this.form.controls.modalidad.enable({ emitEvent: false });
    this.form.controls.idEmpresa.enable({ emitEvent: false });
    this.form.controls.idConductor.enable({ emitEvent: false });
    this.form.controls.idVehiculo.enable({ emitEvent: false });
    this.form.controls.horaInicio.enable({ emitEvent: false });
    this.form.controls.horaFin.enable({ emitEvent: false });
    this.form.controls.tipoServicio.enable({ emitEvent: false });
    this.form.controls.fecha.enable({ emitEvent: false });
    this.form.controls.fechaDesde.enable({ emitEvent: false });
    this.form.controls.fechaHasta.enable({ emitEvent: false });
    this.form.controls.diasSemana.enable({ emitEvent: false });
    this.form.controls.idPlanificacion.disable({ emitEvent: false });
    this.form.controls.idRuta.disable({ emitEvent: false });
    this.reiniciarPasajeros();
    this.seleccionPasajeros.clear();
    this.rutaPasajerosCargada = '';
    this.sincronizarFechas();
    this.actualizarValidadoresFecha();
    this.cargarEmpresas();
    if (empresa) {
      this.form.controls.idEmpresa.setValue(empresa);
    }
  }

  private reiniciarPasajeros(): void {
    this.puntosRuta.set([]);
    this.candidatos.set([]);
    this.busquedaPasajeros.set('');
    this.cargandoPasajeros.set(false);
    this.errorPasajeros.set(null);
    this.errorSeleccionPasajeros.set(null);
  }

  private obtenerPasajeros$(idRuta: string) {
    const idEmpresa = Number(this.form.controls.idEmpresa.value);
    if (!idRuta || !Number.isInteger(idEmpresa) || idEmpresa <= 0) {
      return EMPTY;
    }

    this.cargandoPasajeros.set(true);
    this.errorPasajeros.set(null);
    return forkJoin({
      ruta: this.rutasApi.obtener(idRuta),
      pasajeros: this.pasajerosApi.listar('ACTIVO', idEmpresa),
    }).pipe(
      catchError((err: unknown) => {
        this.cargandoPasajeros.set(false);
        this.errorPasajeros.set(mensajeErrorHttp(err, 'No fue posible cargar los pasajeros de la ruta.'));
        return EMPTY;
      }),
    );
  }

  private aplicarPasajeros(datos: { ruta: Ruta; pasajeros: Pasajero[] }): void {
    const puntos = [...(datos.ruta.puntosRecogida ?? [])]
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

    const candidatos = [...datos.pasajeros]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((pasajero) => {
        const idPuntoHabitual = habitualPorId.get(pasajero.idPasajero) ?? null;
        const previa = this.seleccionPasajeros.get(pasajero.idPasajero);
        const puntoPrevio = previa && puntoSigueEnRuta(previa.idPuntoRecogida, puntos)
          ? previa.idPuntoRecogida
          : null;
        return {
          idPasajero: pasajero.idPasajero,
          nombre: pasajero.nombre,
          rut: pasajero.rut,
          telefono: pasajero.telefono,
          habitual: idPuntoHabitual != null,
          idPuntoHabitual,
          seleccionado: previa ? previa.seleccionado : idPuntoHabitual != null,
          idPuntoRecogida: previa ? (puntoPrevio ?? idPuntoHabitual ?? '') : (idPuntoHabitual ?? ''),
        };
      });

    this.puntosRuta.set(puntos);
    this.candidatos.set(candidatos);
    this.cargandoPasajeros.set(false);
  }

  private conservarFechas(modalidad: ModalidadServicio): void {
    const fecha = this.form.controls.fecha;
    const desde = this.form.controls.fechaDesde;
    const hasta = this.form.controls.fechaHasta;
    if (modalidad === 'recurrente') {
      if (!desde.value && fecha.value) {
        desde.setValue(fecha.value, { emitEvent: false });
      }

      if (!hasta.value && fecha.value) {
        hasta.setValue(fecha.value, { emitEvent: false });
      }

      this.sincronizarFechas();
      return;
    }

    if (!fecha.value && desde.value) {
      fecha.setValue(desde.value, { emitEvent: false });
    }

    this.sincronizarFechas();
  }

  private sincronizarFechas(): void {
    const valores = this.form.getRawValue();
    this.fechaDesdeActual.set(valores.fechaDesde);
    this.fechaHastaActual.set(valores.fechaHasta);
  }

  private ajustarFechasDisponibles(sinDias: boolean, soloAsignacion: boolean): void {
    if (soloAsignacion) {
      return;
    }

    for (const control of [this.form.controls.fecha, this.form.controls.fechaDesde, this.form.controls.fechaHasta]) {
      if (sinDias) {
        control.disable({ emitEvent: false });
      } else if (control.disabled) {
        control.enable({ emitEvent: false });
      }
    }
  }

  private actualizarValidadoresFecha(): void {
    const individual = this.form.controls.modalidad.value === 'individual';
    const periodo = this.planificacionSeleccionada()?.periodo ?? '';
    const validador = fechaProgramable(formatearIso(hoyLocal()), periodo);

    if (individual) {
      this.form.controls.fecha.setValidators([Validators.required, validador]);
      this.form.controls.fechaDesde.clearValidators();
      this.form.controls.fechaHasta.clearValidators();
      this.form.controls.diasSemana.clearValidators();
    } else {
      this.form.controls.fecha.clearValidators();
      this.form.controls.fechaDesde.setValidators([Validators.required, validador]);
      this.form.controls.fechaHasta.setValidators([Validators.required, validador]);
      this.form.controls.diasSemana.setValidators([alMenosUnDia]);
    }

    this.form.controls.fecha.updateValueAndValidity({ emitEvent: false });
    this.form.controls.fechaDesde.updateValueAndValidity({ emitEvent: false });
    this.form.controls.fechaHasta.updateValueAndValidity({ emitEvent: false });
    this.form.controls.diasSemana.updateValueAndValidity({ emitEvent: false });
  }

  private cargarEmpresas(): void {
    this.empresasApi.listar('ACTIVO').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => this.empresas.set(lista),
      error: () => this.empresas.set([]),
    });
  }
}

function horaFinPosterior(grupo: AbstractControl): ValidationErrors | null {
  const inicio = String(grupo.get('horaInicio')?.value ?? '');
  const fin = String(grupo.get('horaFin')?.value ?? '');
  if (!inicio || !fin) {
    return null;
  }

  return fin <= inicio ? { horarioInvalido: true } : null;
}

function rangoFechasRecurrente(grupo: AbstractControl): ValidationErrors | null {
  if (grupo.get('modalidad')?.value !== 'recurrente') {
    return null;
  }

  const desde = String(grupo.get('fechaDesde')?.value ?? '');
  const hasta = String(grupo.get('fechaHasta')?.value ?? '');
  if (!desde || !hasta) {
    return null;
  }

  return desde > hasta ? { rangoFechas: true } : null;
}

function fechaProgramable(hoy: string, periodo: string) {
  const inicio = periodo ? `${periodo}-01` : '';
  const fin = periodo ? ultimoDiaPeriodo(periodo) : '';

  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '');
    if (!valor) {
      return null;
    }

    if (valor < hoy) {
      return { fechaAnterior: true };
    }

    if (inicio && fin && (valor < inicio || valor > fin)) {
      return { fueraDePeriodo: true };
    }

    return null;
  };
}

function alMenosUnDia(control: AbstractControl): ValidationErrors | null {
  const dias = control.value as DiaSemana[] | null;
  return dias && dias.length > 0 ? null : { diasVacios: true };
}

const DIA_JS: Record<DiaSemana, number> = {
  DOMINGO: 0,
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
};

function fechasDeSerie(
  desde: string,
  hasta: string,
  dias: readonly DiaSemana[],
  periodo: string,
  hoy: string,
): string[] | null {
  if (!desde || !hasta || dias.length === 0 || desde > hasta) {
    return null;
  }

  const inicio = periodo ? `${periodo}-01` : '';
  const fin = periodo ? ultimoDiaPeriodo(periodo) : '';
  const semana = new Set(dias.map((dia) => DIA_JS[dia]));
  const fechas: string[] = [];
  let cursor = desde;

  for (let guardia = 0; cursor <= hasta && guardia < 400; guardia += 1) {
    const fecha = parsearIso(cursor);
    if (!fecha) {
      break;
    }

    const enMes = !inicio || !fin || (cursor >= inicio && cursor <= fin);
    if (semana.has(fecha.getDay()) && cursor >= hoy && enMes) {
      fechas.push(cursor);
    }

    cursor = formatearIso(new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1));
  }

  return fechas;
}

function puntoSigueEnRuta(idPunto: string, puntos: readonly { idPunto: string }[]): boolean {
  return !idPunto || puntos.some((punto) => punto.idPunto === idPunto);
}

function ultimoDiaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const dia = new Date(anio, mes, 0).getDate();
  return `${periodo}-${String(dia).padStart(2, '0')}`;
}

function aHoraApi(valor: string): string {
  return /^\d{2}:\d{2}$/.test(valor) ? `${valor}:00` : valor;
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function etiquetaMesPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  const nombre = MESES[Number(mes) - 1];
  return nombre && anio ? `${nombre} de ${anio}` : periodo;
}

function coincideCandidato(candidato: CandidatoPasajeroServicio, termino: string): boolean {
  const consulta = normalizarBusqueda(termino);
  if (!consulta) {
    return true;
  }

  const hay = normalizarBusqueda(`${candidato.nombre} ${candidato.rut}`);
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
