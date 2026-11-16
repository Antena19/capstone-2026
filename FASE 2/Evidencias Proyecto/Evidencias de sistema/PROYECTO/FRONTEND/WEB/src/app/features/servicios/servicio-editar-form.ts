import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { catchError, EMPTY, forkJoin, of, Subject, switchMap, tap } from 'rxjs';
import { Planificacion } from '../../core/models/planificacion';
import { Ruta } from '../../core/models/ruta';
import {
  AlcanceEdicionSerie,
  EdicionServicio,
  Servicio,
  TipoServicio,
} from '../../core/models/servicio';
import { PlanificacionesService } from '../../core/services/planificaciones.service';
import { RutasService } from '../../core/services/rutas.service';
import { ServiciosService } from '../../core/services/servicios.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';

const ALCANCES: { value: AlcanceEdicionSerie; label: string; texto: string }[] = [
  {
    value: 'ESTE',
    label: 'Solo este servicio',
    texto: 'Solo se modificará este servicio.',
  },
  {
    value: 'ESTE_Y_FUTUROS',
    label: 'Este y los futuros',
    texto: 'Se modificará este servicio y las ocurrencias futuras que continúen programadas.',
  },
  {
    value: 'TODOS_PROGRAMADOS',
    label: 'Todos los programados de la serie',
    texto: 'Se modificarán todas las ocurrencias programadas de la serie. Los servicios cancelados, finalizados o en curso no se modificarán.',
  },
];

@Component({
  selector: 'app-servicio-editar-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './servicio-editar-form.html',
  styleUrl: './servicio-editar-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioEditarForm {
  readonly abierto = input(false);
  readonly servicioInicial = input<Servicio | null>(null);
  readonly nombreEmpresaInicial = input('');
  readonly nombreRutaInicial = input('');
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardado = output<EdicionServicio>();
  readonly cancelado = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(ServiciosService);
  private readonly rutasApi = inject(RutasService);
  private readonly planificacionesApi = inject(PlanificacionesService);
  private readonly pedido = new Subject<Servicio>();

  readonly tipos: TipoServicio[] = ['IDA', 'REGRESO', 'ESPECIAL'];
  readonly alcances = ALCANCES;
  readonly esqueletos = [1, 2, 3];

  readonly servicio = signal<Servicio | null>(null);
  readonly rutas = signal<Ruta[]>([]);
  readonly planificacion = signal<Planificacion | null>(null);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly alcanceActual = signal<AlcanceEdicionSerie>('ESTE');
  readonly idRutaActual = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      idRuta: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required],
      tipoServicio: ['', Validators.required],
      alcance: this.fb.nonNullable.control<AlcanceEdicionSerie>('ESTE'),
    },
    { validators: [horaFinPosterior] },
  );

  readonly esRecurrente = computed(() => !!this.servicio()?.idSerie);
  readonly puedeGuardar = computed(
    () => this.servicio()?.estado === 'PROGRAMADO' && !this.cargando() && !this.guardando(),
  );
  readonly cambioRuta = computed(() => {
    const actual = this.servicio();
    return !!actual && this.idRutaActual() !== actual.idRuta;
  });

  readonly etiquetaEmpresa = computed(() => {
    const inicial = this.nombreEmpresaInicial();
    const id = this.servicio()?.idEmpresa;
    return inicial || (id ? `Empresa #${id}` : '—');
  });

  readonly etiquetaPlanificacion = computed(() => {
    const planificacion = this.planificacion();
    if (planificacion) {
      return `${planificacion.periodo} · ${planificacion.estado}`;
    }

    const id = this.servicio()?.idPlanificacion;
    return id ? `Planificación #${id}` : '—';
  });

  readonly textoAlcance = computed(
    () => ALCANCES.find((item) => item.value === this.alcanceActual())?.texto ?? '',
  );

  readonly etiquetaGuardar = computed(() => (this.guardando() ? 'Guardando...' : 'Guardar cambios'));

  constructor() {
    this.form.controls.alcance.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((alcance) => {
      this.alcanceActual.set(alcance);
    });

    this.form.controls.idRuta.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((idRuta) => {
      this.idRutaActual.set(idRuta);
    });

    this.pedido
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((inicial) => {
          this.servicio.set(inicial);
          this.planificacion.set(null);
          this.rutas.set([]);
          this.errorCarga.set(null);
          this.cargando.set(true);
          this.aplicarServicioAlFormulario(inicial);
        }),
        switchMap((inicial) =>
          this.api.obtenerPorId(inicial.idServicio).pipe(
            catchError((err: unknown) => {
              this.cargando.set(false);
              this.errorCarga.set(mensajeErrorHttp(err, 'No fue posible cargar el servicio.'));
              return EMPTY;
            }),
          ),
        ),
        switchMap((servicio) => {
          this.servicio.set(servicio);
          this.aplicarServicioAlFormulario(servicio);
          if (servicio.estado !== 'PROGRAMADO') {
            this.cargando.set(false);
            this.errorCarga.set('Solo se puede editar un servicio en estado PROGRAMADO.');
            return EMPTY;
          }

          return forkJoin({
            planificacion: this.planificacionesApi
              .obtenerPorId(servicio.idPlanificacion)
              .pipe(catchError(() => of(null))),
            rutas: this.cargarRutas$(servicio),
          });
        }),
      )
      .subscribe({
        next: ({ planificacion, rutas }) => {
          this.planificacion.set(planificacion);
          this.rutas.set(rutas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.errorCarga.set(mensajeErrorHttp(err, 'No fue posible cargar los datos para editar.'));
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

      untracked(() => this.pedido.next(inicial));
    });
  }

  seleccionarAlcance(alcance: AlcanceEdicionSerie): void {
    this.form.controls.alcance.setValue(alcance);
  }

  enviar(): void {
    if (this.guardando() || this.cargando()) {
      return;
    }

    const servicio = this.servicio();
    if (!servicio) {
      return;
    }

    if (servicio.estado !== 'PROGRAMADO') {
      this.errorCarga.set('Solo se puede editar un servicio en estado PROGRAMADO.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const horaInicio = aHoraApi(valores.horaInicio);
    const horaFin = aHoraApi(valores.horaFin);
    const tipoServicio = valores.tipoServicio as TipoServicio;

    if (servicio.idSerie) {
      this.guardado.emit({
        tipo: 'serie',
        idServicio: servicio.idServicio,
        solicitud: {
          alcance: valores.alcance,
          idRuta: valores.idRuta,
          horaInicio,
          horaFin,
          tipoServicio,
        },
      });
      return;
    }

    this.guardado.emit({
      tipo: 'individual',
      idServicio: servicio.idServicio,
      solicitud: {
        idEmpresa: servicio.idEmpresa,
        idPlanificacion: servicio.idPlanificacion,
        idRuta: valores.idRuta,
        fecha: servicio.fecha.slice(0, 10),
        horaInicio,
        horaFin,
        tipoServicio,
      },
    });
  }

  mensajeCampo(control: 'idRuta' | 'horaInicio' | 'horaFin' | 'tipoServicio'): string | null {
    if (control === 'horaFin' && this.form.hasError('horarioInvalido') && this.form.controls.horaFin.touched) {
      return 'La hora de fin debe ser posterior a la hora de inicio.';
    }

    const campo = this.form.controls[control];
    if (!campo.touched || !campo.invalid) {
      return null;
    }

    if (campo.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    return 'Dato inválido.';
  }

  formatearFecha(fecha: string): string {
    const iso = fecha.slice(0, 10);
    const partes = iso.split('-');
    return partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
  }

  private aplicarServicioAlFormulario(servicio: Servicio): void {
    this.form.reset({
      idRuta: servicio.idRuta,
      horaInicio: aHoraInput(servicio.horaInicio),
      horaFin: aHoraInput(servicio.horaFin),
      tipoServicio: servicio.tipoServicio,
      alcance: 'ESTE',
    });
    this.alcanceActual.set('ESTE');
    this.idRutaActual.set(servicio.idRuta);
  }

  private cargarRutas$(servicio: Servicio) {
    return this.rutasApi.listar(servicio.idEmpresa, 'ACTIVO').pipe(
      switchMap((lista) => {
        if (lista.some((ruta) => ruta.idRuta === servicio.idRuta)) {
          return of(lista);
        }

        return this.rutasApi.obtener(servicio.idRuta).pipe(
          switchMap((ruta) => of([ruta, ...lista])),
          catchError(() => of(lista)),
        );
      }),
      catchError(() => of([] as Ruta[])),
    );
  }

  private limpiar(): void {
    this.servicio.set(null);
    this.rutas.set([]);
    this.planificacion.set(null);
    this.cargando.set(false);
    this.errorCarga.set(null);
    this.alcanceActual.set('ESTE');
    this.idRutaActual.set('');
    this.form.reset({
      idRuta: '',
      horaInicio: '',
      horaFin: '',
      tipoServicio: '',
      alcance: 'ESTE',
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

function aHoraApi(valor: string): string {
  return /^\d{2}:\d{2}$/.test(valor) ? `${valor}:00` : valor;
}

function aHoraInput(valor: string): string {
  return valor.length >= 5 ? valor.slice(0, 5) : valor;
}
