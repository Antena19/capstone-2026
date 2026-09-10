import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY, forkJoin, map, of, Subject, switchMap, tap } from 'rxjs';
import { AsignacionServicio } from '../../core/models/asignacion';
import { Conductor } from '../../core/models/conductor';
import { Servicio } from '../../core/models/servicio';
import { Vehiculo } from '../../core/models/vehiculo';
import { AsignacionesService } from '../../core/services/asignaciones.service';
import { ConductoresService } from '../../core/services/conductores.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { PasajerosServicioService } from '../../core/services/pasajeros-servicio.service';
import { ServiciosService } from '../../core/services/servicios.service';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';

@Component({
  selector: 'app-servicio-asignacion-form',
  imports: [ReactiveFormsModule, ActionButton],
  templateUrl: './servicio-asignacion-form.html',
  styleUrl: './servicio-asignacion-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioAsignacionForm {
  readonly abierto = input(false);
  readonly servicioInicial = input<Servicio | null>(null);
  readonly cerrado = output<void>();
  readonly guardado = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(ServiciosService);
  private readonly asignacionesApi = inject(AsignacionesService);
  private readonly conductoresApi = inject(ConductoresService);
  private readonly vehiculosApi = inject(VehiculosService);
  private readonly pasajerosServicioApi = inject(PasajerosServicioService);
  private readonly feedback = inject(FeedbackService);
  private readonly pedido = new Subject<Servicio>();

  readonly esqueletos = [1, 2, 3];
  readonly servicio = signal<Servicio | null>(null);
  readonly asignacion = signal<AsignacionServicio | null>(null);
  readonly conductores = signal<Conductor[]>([]);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly pasajerosActivos = signal(0);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    idConductor: ['', Validators.required],
    idVehiculo: ['', Validators.required],
  });

  readonly esReemplazo = computed(() => !!this.asignacion());
  readonly esRecurrente = computed(() => !!this.servicio()?.idSerie);
  readonly mutando = computed(() => this.guardando());

  readonly vehiculoSeleccionado = computed(() => {
    const id = Number(this.idVehiculoActual());
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    return this.vehiculos().find((item) => item.idVehiculo === id) ?? null;
  });

  readonly capacidadExcedida = computed(() => {
    const vehiculo = this.vehiculoSeleccionado();
    if (!vehiculo) {
      return false;
    }

    return this.pasajerosActivos() > vehiculo.capacidad;
  });

  readonly etiquetaGuardar = computed(() => {
    if (this.guardando()) {
      return 'Guardando...';
    }

    return this.esReemplazo() ? 'Cambiar asignación' : 'Asignar';
  });

  readonly hayCambio = computed(() => {
    const actual = this.asignacion();
    const idConductor = Number(this.idConductorActual());
    const idVehiculo = Number(this.idVehiculoActual());
    if (!actual) {
      return idConductor > 0 && idVehiculo > 0;
    }

    return idConductor !== actual.idConductor || idVehiculo !== actual.idVehiculo;
  });

  private readonly idConductorActual = signal('');
  private readonly idVehiculoActual = signal('');

  constructor() {
    this.form.controls.idConductor.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => this.idConductorActual.set(valor));
    this.form.controls.idVehiculo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => this.idVehiculoActual.set(valor));

    this.pedido
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.cargando.set(true);
          this.errorCarga.set(null);
          this.error.set(null);
          this.form.reset({ idConductor: '', idVehiculo: '' });
        }),
        switchMap((inicial) =>
          this.api.obtenerPorId(inicial.idServicio).pipe(
            catchError((err: unknown) => {
              this.cargando.set(false);
              this.errorCarga.set(mensajeErrorHttp(err, 'No fue posible cargar el servicio.'));
              return EMPTY;
            }),
            switchMap((servicio) =>
              forkJoin({
                servicio: of(servicio),
                asignaciones: this.asignacionesApi.listar({
                  idServicio: servicio.idServicio,
                  estado: 'ACTIVA',
                }),
                conductores: this.conductoresApi.listar('ACTIVO'),
                vehiculos: this.vehiculosApi.listar('ACTIVO'),
                asociaciones: this.pasajerosServicioApi.listar({
                  idServicio: servicio.idServicio,
                  estado: 'ACTIVO',
                }),
              }).pipe(
                switchMap(({ servicio: actual, asignaciones, conductores, vehiculos, asociaciones }) => {
                  const activa = elegirActiva(asignaciones);
                  if (!activa) {
                    return of({
                      servicio: actual,
                      asignacion: null as AsignacionServicio | null,
                      conductores,
                      vehiculos,
                      pasajerosActivos: asociaciones.length,
                    });
                  }

                  return forkJoin({
                    conductorActual: conductores.some((item) => item.idConductor === activa.idConductor)
                      ? of(null)
                      : this.conductoresApi.obtenerPorId(activa.idConductor).pipe(catchError(() => of(null))),
                    vehiculoActual: vehiculos.some((item) => item.idVehiculo === activa.idVehiculo)
                      ? of(null)
                      : this.vehiculosApi.obtenerPorId(activa.idVehiculo).pipe(catchError(() => of(null))),
                  }).pipe(
                    map(({ conductorActual, vehiculoActual }) => ({
                      servicio: actual,
                      asignacion: activa,
                      conductores: fusionarConductor(conductores, conductorActual),
                      vehiculos: fusionarVehiculo(vehiculos, vehiculoActual),
                      pasajerosActivos: asociaciones.length,
                    })),
                  );
                }),
                catchError((err: unknown) => {
                  this.cargando.set(false);
                  this.errorCarga.set(mensajeErrorHttp(err, 'No fue posible cargar la asignación.'));
                  return EMPTY;
                }),
              ),
            ),
          ),
        ),
      )
      .subscribe(({ servicio, asignacion, conductores, vehiculos, pasajerosActivos }) => {
        this.servicio.set(servicio);
        this.asignacion.set(asignacion);
        this.conductores.set(conductores);
        this.vehiculos.set(vehiculos);
        this.pasajerosActivos.set(pasajerosActivos);
        this.form.reset({
          idConductor: asignacion ? String(asignacion.idConductor) : '',
          idVehiculo: asignacion ? String(asignacion.idVehiculo) : '',
        });
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
    if (inicial && !this.guardando()) {
      this.pedido.next(inicial);
    }
  }

  cerrar(): void {
    if (this.guardando()) {
      return;
    }

    this.cerrado.emit();
  }

  etiquetaConductor(conductor: Conductor): string {
    return `${conductor.nombre} · ${conductor.rut} · ${conductor.telefono}`;
  }

  etiquetaVehiculo(vehiculo: Vehiculo): string {
    return `${vehiculo.patente} · ${vehiculo.tipo} · ${vehiculo.marca} ${vehiculo.modelo} · ${vehiculo.capacidad} pasajeros`;
  }

  enviar(): void {
    if (this.guardando() || this.cargando()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const servicio = this.servicio();
    if (!servicio) {
      return;
    }

    const idConductor = Number(this.form.controls.idConductor.value);
    const idVehiculo = Number(this.form.controls.idVehiculo.value);
    if (!Number.isInteger(idConductor) || idConductor <= 0 || !Number.isInteger(idVehiculo) || idVehiculo <= 0) {
      this.error.set('Debe indicar un conductor y un vehículo válidos.');
      return;
    }

    const actual = this.asignacion();
    if (actual && idConductor === actual.idConductor && idVehiculo === actual.idVehiculo) {
      this.error.set('No existe un cambio de conductor o vehículo que registrar.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const peticion = actual
      ? this.asignacionesApi.reemplazar(actual.idAsignacion, { idConductor, idVehiculo })
      : this.asignacionesApi.crear({ idServicio: servicio.idServicio, idConductor, idVehiculo });

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.feedback.mostrar(
          actual ? 'Asignación actualizada correctamente.' : 'Asignación creada correctamente.',
        );
        this.guardado.emit();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible guardar la asignación.'));
      },
    });
  }

  private limpiar(): void {
    this.servicio.set(null);
    this.asignacion.set(null);
    this.conductores.set([]);
    this.vehiculos.set([]);
    this.pasajerosActivos.set(0);
    this.cargando.set(false);
    this.errorCarga.set(null);
    this.error.set(null);
    this.guardando.set(false);
    this.form.reset({ idConductor: '', idVehiculo: '' });
  }
}

function elegirActiva(asignaciones: AsignacionServicio[]): AsignacionServicio | null {
  const activas = asignaciones.filter((item) => item.estado === 'ACTIVA');
  if (activas.length === 0) {
    return null;
  }

  return [...activas].sort((a, b) => b.idAsignacion - a.idAsignacion)[0];
}

function fusionarConductor(lista: Conductor[], extra: Conductor | null): Conductor[] {
  if (!extra || lista.some((item) => item.idConductor === extra.idConductor)) {
    return lista;
  }

  return [extra, ...lista];
}

function fusionarVehiculo(lista: Vehiculo[], extra: Vehiculo | null): Vehiculo[] {
  if (!extra || lista.some((item) => item.idVehiculo === extra.idVehiculo)) {
    return lista;
  }

  return [extra, ...lista];
}
