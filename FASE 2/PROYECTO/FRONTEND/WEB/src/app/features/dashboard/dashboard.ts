import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { catchError, concat, distinctUntilChanged, EMPTY, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  DashboardConsulta,
  DashboardEmpresa,
  DashboardEvolucion,
  DashboardResumen,
  PeriodoRapido,
} from '../../core/models/dashboard';
import {
  agrupacionParaRango,
  etiquetaPeriodo,
  etiquetaRango,
  formatearIso,
  hoyLocal,
  rangoPeriodo,
} from '../../core/utils/fechas';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { Icon } from '../../shared/components/icon/icon';
import { KpiCard } from '../../shared/components/kpi-card/kpi-card';
import { PageHeader } from '../../shared/components/page-header/page-header';

type VistaDashboard =
  | { fase: 'loading' }
  | { fase: 'error' }
  | { fase: 'ok'; resumen: DashboardResumen; evolucion: DashboardEvolucion; empresas: DashboardEmpresa[] };

const COLOR_PLANIFICADO = '#2563eb';
const COLOR_REALIZADO = '#10b981';

@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, ActionButton, FilterSelect, KpiCard, AppCard, Icon, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);

  readonly opcionesPeriodo: FilterOption[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta semana' },
    { value: 'mes', label: 'Este mes' },
    { value: 'personalizado', label: 'Personalizado' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6, 7, 8];

  readonly idEmpresa = signal('');
  readonly periodo = signal<PeriodoRapido>('hoy');
  readonly desdePersonalizado = signal(formatearIso(hoyLocal()));
  readonly hastaPersonalizado = signal(formatearIso(hoyLocal()));
  private readonly empresasFiltro = signal<DashboardEmpresa[]>([]);

  readonly opcionesGrafico: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          font: { family: 'Inter, sans-serif', size: 12 },
          color: '#64748b',
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Inter, sans-serif', size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { family: 'Inter, sans-serif', size: 11 } },
        grid: { color: '#e2e8f0' },
        border: { display: false },
      },
    },
  };

  readonly errorValidacion = computed(() => {
    if (this.periodo() !== 'personalizado') {
      return null;
    }

    const desde = this.desdePersonalizado();
    const hasta = this.hastaPersonalizado();
    if (!desde || !hasta) {
      return 'Seleccione fecha desde y hasta.';
    }

    if (desde > hasta) {
      return 'La fecha desde no puede ser posterior a la fecha hasta.';
    }

    return null;
  });

  readonly consulta = computed<DashboardConsulta | null>(() => {
    if (this.errorValidacion()) {
      return null;
    }

    const rango = rangoPeriodo(this.periodo(), this.desdePersonalizado(), this.hastaPersonalizado());
    if (!rango.desde || !rango.hasta) {
      return null;
    }

    const id = this.idEmpresa();
    return {
      idEmpresa: id === '' ? null : Number(id),
      desde: rango.desde,
      hasta: rango.hasta,
      agrupacion: agrupacionParaRango(this.periodo(), rango.desde, rango.hasta),
    };
  });

  readonly vista = toSignal(
    toObservable(this.consulta).pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap((consulta) => {
        if (!consulta) {
          return EMPTY;
        }

        return concat(
          of<VistaDashboard>({ fase: 'loading' }),
          forkJoin({
            resumen: this.dashboard.obtenerResumen(consulta),
            evolucion: this.dashboard.obtenerEvolucion(consulta),
            empresas: this.dashboard.obtenerEmpresas(consulta),
          }).pipe(
            tap((datos) => this.empresasFiltro.set(datos.empresas)),
            map(
              (datos): VistaDashboard => ({
                fase: 'ok',
                resumen: datos.resumen,
                evolucion: datos.evolucion,
                empresas: datos.empresas,
              }),
            ),
            catchError(() => of<VistaDashboard>({ fase: 'error' })),
          ),
        );
      }),
    ),
    { initialValue: { fase: 'loading' } satisfies VistaDashboard },
  );

  readonly cargando = computed(() => this.vista().fase === 'loading');
  readonly errorCarga = computed(() => this.vista().fase === 'error');
  readonly resumen = computed(() => {
    const vista = this.vista();
    return vista.fase === 'ok' ? vista.resumen : null;
  });
  readonly evolucion = computed(() => {
    const vista = this.vista();
    return vista.fase === 'ok' ? vista.evolucion : null;
  });
  readonly empresas = computed(() => {
    const vista = this.vista();
    return vista.fase === 'ok' ? vista.empresas : [];
  });

  readonly opcionesEmpresa = computed<FilterOption[]>(() =>
    this.empresasFiltro().map((empresa) => ({
      value: String(empresa.idEmpresa),
      label: empresa.razonSocial,
    })),
  );

  readonly subtitulo = computed(() => {
    const consulta = this.consulta();
    const rango = consulta ? etiquetaRango(consulta.desde, consulta.hasta) : '';
    return rango
      ? `Monitoreo de planificación y operación real · ${rango}`
      : 'Monitoreo de planificación y operación real';
  });

  readonly sinActividad = computed(() => {
    const resumen = this.resumen();
    if (!resumen) {
      return false;
    }

    return (
      resumen.serviciosPlanificados === 0 &&
      resumen.personasPlanificadas === 0 &&
      resumen.totalTransportados === 0
    );
  });

  readonly graficoServicios = computed<ChartData<'bar'>>(() =>
    this.construirGrafico('serviciosPlanificados', 'serviciosRealizados', 'Planificados', 'Realizados'),
  );

  readonly graficoPersonas = computed<ChartData<'bar'>>(() =>
    this.construirGrafico(
      'personasPlanificadas',
      'totalTransportados',
      'Planificadas',
      'Transportadas',
    ),
  );

  actualizarPeriodo(valor: string): void {
    const siguiente = valor as PeriodoRapido;

    if (siguiente === 'personalizado') {
      const rango = rangoPeriodo(this.periodo(), this.desdePersonalizado(), this.hastaPersonalizado());
      this.desdePersonalizado.set(rango.desde);
      this.hastaPersonalizado.set(rango.hasta);
    }

    this.periodo.set(siguiente);
  }

  actualizarDesde(event: Event): void {
    this.desdePersonalizado.set((event.target as HTMLInputElement).value);
  }

  actualizarHasta(event: Event): void {
    this.hastaPersonalizado.set((event.target as HTMLInputElement).value);
  }

  irAReportes(): void {
    void this.router.navigate(['/reportes']);
  }

  empresaSeleccionada(idEmpresa: number): boolean {
    return this.idEmpresa() === String(idEmpresa);
  }

  formatoEntero(valor: number): string {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valor);
  }

  formatoPorcentaje(valor: number): string {
    const numero = Number.isFinite(valor) ? valor : 0;
    return `${new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numero)}%`;
  }

  private construirGrafico(
    campoPlanificado: 'serviciosPlanificados' | 'personasPlanificadas',
    campoRealizado: 'serviciosRealizados' | 'totalTransportados',
    etiquetaPlanificado: string,
    etiquetaRealizado: string,
  ): ChartData<'bar'> {
    const evolucion = this.evolucion();
    const series = evolucion?.series ?? [];
    const agrupacion = evolucion?.agrupacion ?? 'DIA';

    return {
      labels: series.map((punto) => etiquetaPeriodo(punto.periodo, agrupacion)),
      datasets: [
        {
          label: etiquetaPlanificado,
          data: series.map((punto) => punto[campoPlanificado]),
          backgroundColor: COLOR_PLANIFICADO,
          borderRadius: 4,
          maxBarThickness: 28,
        },
        {
          label: etiquetaRealizado,
          data: series.map((punto) => punto[campoRealizado]),
          backgroundColor: COLOR_REALIZADO,
          borderRadius: 4,
          maxBarThickness: 28,
        },
      ],
    };
  }
}
