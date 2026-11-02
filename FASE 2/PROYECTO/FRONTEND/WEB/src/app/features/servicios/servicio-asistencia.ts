import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Pasajero } from '../../core/models/pasajero';
import { PasajeroServicio, Servicio } from '../../core/models/servicio';
import { Asistencia } from '../../core/models/asistencia';
import { AsistenciasService } from '../../core/services/asistencias.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { PasajerosServicioService } from '../../core/services/pasajeros-servicio.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { etiquetaMetodoRegistro } from '../../core/utils/metodo-asistencia';
import { formatearFechaHoraInstanteChile } from '../../core/utils/instantes';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import {
  FilaAsistenciaServicio,
  construirFilasAsistencia,
  etiquetaParticipacion,
  resumenAsistencia,
} from './servicio-asistencia-filas';

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

  readonly filas = computed(() =>
    construirFilasAsistencia(this.asociaciones(), this.asistencias(), this.pasajeros()),
  );

  readonly resumen = computed(() => resumenAsistencia(this.filas()));

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

  readonly etiquetaMetodo = etiquetaMetodoRegistro;
  readonly etiquetaParticipacion = etiquetaParticipacion;

  etiquetaConfirmacion(fila: FilaAsistenciaServicio): string {
    switch (fila.confirmacion) {
      case 'CONFIRMADO':
        return 'Confirmado';
      case 'PENDIENTE':
        return 'Pendiente';
      case 'RECHAZADO':
        return 'Rechazado';
      default:
        return '—';
    }
  }

  etiquetaAsistencia(fila: FilaAsistenciaServicio): string {
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

  tonoAsistencia(fila: FilaAsistenciaServicio): 'green' | 'amber' | 'slate' {
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

    return formatearFechaHoraInstanteChile(valor, '/') ?? valor;
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
