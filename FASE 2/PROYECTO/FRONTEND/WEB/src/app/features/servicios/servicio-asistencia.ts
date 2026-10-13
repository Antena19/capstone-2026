import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Asistencia, EstadoAsistencia } from '../../core/models/asistencia';
import { Pasajero } from '../../core/models/pasajero';
import { PasajeroServicio, Servicio } from '../../core/models/servicio';
import { AsistenciasService } from '../../core/services/asistencias.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { PasajerosServicioService } from '../../core/services/pasajeros-servicio.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';

interface FilaAsistencia {
  idPasajero: number;
  nombre: string;
  rut: string;
  registrada: boolean;
  estado: EstadoAsistencia | null;
  fechaHora: string | null;
}

@Component({
  selector: 'app-servicio-asistencia',
  imports: [ActionButton, StatusBadge],
  templateUrl: './servicio-asistencia.html',
  styleUrl: './servicio-asistencia.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioAsistencia {
  readonly abierto = input(false);
  readonly servicioInicial = input<Servicio | null>(null);
  readonly cerrado = output<void>();

  private readonly asistenciasApi = inject(AsistenciasService);
  private readonly pasajerosServicioApi = inject(PasajerosServicioService);
  private readonly pasajerosApi = inject(PasajerosService);
  private cargaId = 0;

  readonly esqueletos = [1, 2, 3];
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  private readonly asociaciones = signal<PasajeroServicio[]>([]);
  private readonly asistencias = signal<Asistencia[]>([]);
  private readonly pasajeros = signal<Pasajero[]>([]);

  readonly pasajerosAsociados = computed(() => this.filas().length);

  readonly asistenciasRegistradas = computed(
    () => this.filas().filter((fila) => fila.registrada).length,
  );

  readonly porcentajeRegistro = computed(() => {
    const total = this.pasajerosAsociados();
    if (total === 0) {
      return '—';
    }

    return `${Math.round((this.asistenciasRegistradas() / total) * 100)}%`;
  });

  readonly filas = computed(() => construirFilas(this.asociaciones(), this.asistencias(), this.pasajeros()));

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      const servicio = this.servicioInicial();
      if (!abierto || !servicio) {
        return;
      }

      untracked(() => this.cargar(servicio));
    });
  }

  reintentar(): void {
    const servicio = this.servicioInicial();
    if (servicio) {
      this.cargar(servicio);
    }
  }

  etiquetaAsistencia(fila: FilaAsistencia): string {
    switch (fila.estado) {
      case 'VALIDA':
        return 'Asistencia registrada';
      case 'PROVISIONAL':
        return 'Asistencia provisional';
      case 'ANULADA':
        return 'Asistencia anulada';
      default:
        return 'Sin asistencia registrada';
    }
  }

  tonoAsistencia(fila: FilaAsistencia): 'green' | 'amber' | 'slate' {
    if (fila.estado === 'VALIDA') {
      return 'green';
    }

    if (fila.estado === 'PROVISIONAL') {
      return 'amber';
    }

    return 'slate';
  }

  formatearFechaHora(valor: string | null): string {
    if (!valor) {
      return '—';
    }

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return valor;
    }

    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const yyyy = fecha.getFullYear();
    const hh = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  private cargar(servicio: Servicio): void {
    const solicitud = ++this.cargaId;
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      asociaciones: this.pasajerosServicioApi.listar({ idServicio: servicio.idServicio }),
      asistencias: this.asistenciasApi.listarPorServicio(servicio.idServicio),
      pasajeros: this.pasajerosApi.listar(null, servicio.idEmpresa).pipe(catchError(() => of([] as Pasajero[]))),
    }).subscribe({
      next: ({ asociaciones, asistencias, pasajeros }) => {
        if (solicitud !== this.cargaId) {
          return;
        }

        this.asociaciones.set(asociaciones);
        this.asistencias.set(asistencias);
        this.pasajeros.set(pasajeros);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        if (solicitud !== this.cargaId) {
          return;
        }

        this.asociaciones.set([]);
        this.asistencias.set([]);
        this.pasajeros.set([]);
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar la asistencia del servicio.'));
      },
    });
  }
}

function asistenciaVigente(estado: EstadoAsistencia): boolean {
  return estado === 'VALIDA' || estado === 'PROVISIONAL';
}

function construirFilas(
  asociaciones: PasajeroServicio[],
  asistencias: Asistencia[],
  pasajeros: Pasajero[],
): FilaAsistencia[] {
  const personas = new Map(pasajeros.map((item) => [item.idPasajero, item]));
  const asistenciaPorPasajero = new Map<number, Asistencia>();
  for (const asistencia of asistencias) {
    const previa = asistenciaPorPasajero.get(asistencia.idPasajero);
    if (!previa || asistencia.fechaHora > previa.fechaHora) {
      asistenciaPorPasajero.set(asistencia.idPasajero, asistencia);
    }
  }

  const asociacionPorPasajero = new Map<number, PasajeroServicio>();
  for (const asociacion of asociaciones) {
    const previa = asociacionPorPasajero.get(asociacion.idPasajero);
    if (!previa || (previa.estado !== 'ACTIVO' && asociacion.estado === 'ACTIVO')) {
      asociacionPorPasajero.set(asociacion.idPasajero, asociacion);
    }
  }

  return [...asociacionPorPasajero.values()]
    .filter((asociacion) => asociacion.estado === 'ACTIVO')
    .map((asociacion) => {
      const persona = personas.get(asociacion.idPasajero);
      const asistencia = asistenciaPorPasajero.get(asociacion.idPasajero);
      return {
        idPasajero: asociacion.idPasajero,
        nombre: persona?.nombre ?? `Pasajero #${asociacion.idPasajero}`,
        rut: persona?.rut ?? '—',
        registrada: !!asistencia && asistenciaVigente(asistencia.estado),
        estado: asistencia?.estado ?? null,
        fechaHora: asistencia?.fechaHora ?? null,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
