import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { catchError, EMPTY, forkJoin, Subject, switchMap, tap } from 'rxjs';
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
import { EmpresasService } from '../../core/services/empresas.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { PlanificacionesService } from '../../core/services/planificaciones.service';
import { RutasService } from '../../core/services/rutas.service';
import { formatearIso, hoyLocal } from '../../core/utils/fechas';
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
  readonly guardado = output<AltaServicio>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly empresasApi = inject(EmpresasService);
  private readonly planificacionesApi = inject(PlanificacionesService);
  private readonly rutasApi = inject(RutasService);
  private readonly pasajerosApi = inject(PasajerosService);
  private readonly recargaPasajeros = new Subject<string>();

  readonly diasSemana = DIAS;
  readonly tipos: TipoServicio[] = ['IDA', 'REGRESO', 'ESPECIAL'];
  readonly esqueletosPasajeros = [1, 2, 3];

  readonly empresas = signal<Empresa[]>([]);
  readonly planificaciones = signal<Planificacion[]>([]);
  readonly rutas = signal<Ruta[]>([]);
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

  readonly fechaMinima = computed(() => {
    const hoy = formatearIso(hoyLocal());
    const periodo = this.planificacionSeleccionada()?.periodo;
    if (!periodo) {
      return hoy;
    }

    const inicio = `${periodo}-01`;
    return hoy > inicio ? hoy : inicio;
  });

  readonly fechaMaxima = computed(() => {
    const periodo = this.planificacionSeleccionada()?.periodo;
    return periodo ? ultimoDiaPeriodo(periodo) : '';
  });

  readonly etiquetaGuardar = computed(() => {
    if (this.guardando()) {
      return 'Creando...';
    }

    return this.modalidadActual() === 'recurrente' ? 'Crear serie' : 'Crear servicio';
  });

  readonly rangoFechasEtiqueta = computed(() => {
    const planificacion = this.planificacionSeleccionada();
    if (!planificacion) {
      return null;
    }

    return `Período ${planificacion.periodo} (${planificacion.estado}): ${formatearFechaUi(this.fechaMinima())} a ${formatearFechaUi(this.fechaMaxima())}.`;
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

    this.form.controls.modalidad.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((modalidad) => {
      this.modalidadActual.set(modalidad);
      this.actualizarValidadoresFecha();
    });

    this.form.controls.idEmpresa.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((idEmpresa) => {
          this.idEmpresaActual.set(idEmpresa);
          this.form.patchValue({ idPlanificacion: '' }, { emitEvent: false });
          this.idPlanificacionActual.set('');
          this.idRutaActual.set('');
          this.form.controls.idRuta.setValue('');
          this.recargaPasajeros.next('');
        }),
        switchMap((idEmpresa) => {
          const id = Number(idEmpresa);
          if (!Number.isInteger(id) || id <= 0) {
            this.planificaciones.set([]);
            this.rutas.set([]);
            this.form.controls.idPlanificacion.disable({ emitEvent: false });
            this.form.controls.idRuta.disable({ emitEvent: false });
            return EMPTY;
          }

          this.form.controls.idPlanificacion.enable({ emitEvent: false });
          this.form.controls.idRuta.enable({ emitEvent: false });
          return forkJoin({
            planificaciones: this.planificacionesApi.listar({ idEmpresa: id }),
            rutas: this.rutasApi.listar(id, 'ACTIVO'),
          });
        }),
      )
      .subscribe({
        next: ({ planificaciones, rutas }) => {
          this.planificaciones.set(
            planificaciones.filter((item) => item.estado === 'BORRADOR' || item.estado === 'ACTIVA'),
          );
          this.rutas.set(rutas);
        },
        error: () => {
          this.planificaciones.set([]);
          this.rutas.set([]);
        },
      });

    this.form.controls.idPlanificacion.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      this.idPlanificacionActual.set(id);
    });

    this.form.controls.idRuta.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((idRuta) => {
      this.idRutaActual.set(idRuta);
      this.recargaPasajeros.next(idRuta);
    });

    this.recargaPasajeros
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reiniciarPasajeros()),
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

  seleccionarModalidad(modalidad: ModalidadServicio): void {
    this.form.controls.modalidad.setValue(modalidad);
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
    if (this.guardando()) {
      return;
    }

    this.actualizarValidadoresFecha();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const pasajeros = this.pasajerosParaEnvio();
    if (pasajeros === null) {
      return;
    }

    const valores = this.form.getRawValue();
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
    });
  }

  mensajeCampo(
    control:
      | 'idEmpresa'
      | 'idPlanificacion'
      | 'idRuta'
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

  private reiniciar(): void {
    this.form.reset({
      modalidad: 'individual',
      idEmpresa: '',
      idPlanificacion: '',
      idRuta: '',
      horaInicio: '',
      horaFin: '',
      tipoServicio: '',
      fecha: '',
      fechaDesde: '',
      fechaHasta: '',
      diasSemana: [],
    });
    this.idEmpresaActual.set('');
    this.idPlanificacionActual.set('');
    this.idRutaActual.set('');
    this.modalidadActual.set('individual');
    this.diasSeleccionados.set([]);
    this.planificaciones.set([]);
    this.rutas.set([]);
    this.form.controls.idPlanificacion.disable({ emitEvent: false });
    this.form.controls.idRuta.disable({ emitEvent: false });
    this.reiniciarPasajeros();
    this.actualizarValidadoresFecha();
    this.cargarEmpresas();
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
        return {
          idPasajero: pasajero.idPasajero,
          nombre: pasajero.nombre,
          rut: pasajero.rut,
          telefono: pasajero.telefono,
          habitual: idPuntoHabitual != null,
          idPuntoHabitual,
          seleccionado: idPuntoHabitual != null,
          idPuntoRecogida: idPuntoHabitual ?? '',
        };
      });

    this.puntosRuta.set(puntos);
    this.candidatos.set(candidatos);
    this.cargandoPasajeros.set(false);
  }

  private actualizarValidadoresFecha(): void {
    const individual = this.form.controls.modalidad.value === 'individual';
    const hoy = formatearIso(hoyLocal());

    if (individual) {
      this.form.controls.fecha.setValidators([Validators.required, fechaNoAnterior(hoy)]);
      this.form.controls.fechaDesde.clearValidators();
      this.form.controls.fechaHasta.clearValidators();
      this.form.controls.diasSemana.clearValidators();
    } else {
      this.form.controls.fecha.clearValidators();
      this.form.controls.fechaDesde.setValidators([Validators.required, fechaNoAnterior(hoy)]);
      this.form.controls.fechaHasta.setValidators([Validators.required, fechaNoAnterior(hoy)]);
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

function fechaNoAnterior(hoy: string) {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '');
    if (!valor) {
      return null;
    }

    return valor < hoy ? { fechaAnterior: true } : null;
  };
}

function alMenosUnDia(control: AbstractControl): ValidationErrors | null {
  const dias = control.value as DiaSemana[] | null;
  return dias && dias.length > 0 ? null : { diasVacios: true };
}

function ultimoDiaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const dia = new Date(anio, mes, 0).getDate();
  return `${periodo}-${String(dia).padStart(2, '0')}`;
}

function aHoraApi(valor: string): string {
  return /^\d{2}:\d{2}$/.test(valor) ? `${valor}:00` : valor;
}

function formatearFechaUi(iso: string): string {
  const partes = iso.slice(0, 10).split('-');
  return partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : iso;
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
