import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { catchError, concat, distinctUntilChanged, EMPTY, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportesService } from '../../core/services/reportes.service';
import {
  DashboardConsulta,
  DashboardEmpresa,
  DashboardResumen,
  PeriodoRapido,
} from '../../core/models/dashboard';
import { ReporteServicio } from '../../core/models/reporte';
import {
  agrupacionParaRango,
  etiquetaPeriodo,
  etiquetaRango,
  formatearIso,
  hoyLocal,
  rangoPeriodo,
} from '../../core/utils/fechas';
import { PALETA_OPERACIONAL } from '../../core/constants/paleta-operacional';
import {
  contarClases,
  instanteChile,
  porcentaje,
  seriePasajerosFinalizados,
  serieServicios,
  totalesPasajerosFinalizados,
} from './clasificacion-operacion';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { DoughnutCard } from '../../shared/components/doughnut-card/doughnut-card';
import { DoughnutSegment } from '../../shared/components/doughnut-card/doughnut-segment';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { Icon } from '../../shared/components/icon/icon';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { DesviacionesOperacionales } from './desviaciones-operacionales';
import { PieOperacional } from './pie-operacional';
import { ResumenEmpresas } from './resumen-empresas';
type VistaDashboard =
  | { fase: 'loading' }
  | { fase: 'error' }
  | { fase: 'ok'; resumen: DashboardResumen; empresas: DashboardEmpresa[]; servicios: ReporteServicio[] };

@Component({
  selector: 'app-dashboard',
  imports: [
    PageHeader,
    ActionButton,
    FilterSelect,
    AppCard,
    Icon,
    BaseChartDirective,
    DoughnutCard,
    DesviacionesOperacionales,
    PieOperacional,
    ResumenEmpresas,
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly dashboard = inject(DashboardService);
  private readonly reportes = inject(ReportesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ventanaGraficos = viewChild<ElementRef<HTMLElement>>('ventanaGraficos');
  private readonly consultaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
  private ignorarDesplazamiento = false;
  private punteroSobreCarrusel = false;
  private focoEnCarrusel = false;
  private movimientoReducido = this.consultaMovimiento.matches;
  private temporizadorCarrusel: ReturnType<typeof setTimeout> | null = null;

  readonly opcionesPeriodo: FilterOption[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta semana' },
    { value: 'mes', label: 'Este mes' },
    { value: 'personalizado', label: 'Personalizado' },
  ];

  readonly panelesGrafico = [
    { id: 'servicios', titulo: 'Servicios' },
    { id: 'pasajeros', titulo: 'Pasajeros' },
  ] as const;
  readonly indiceGrafico = signal(0);

  readonly idEmpresa = signal('');
  readonly periodo = signal<PeriodoRapido>('mes');
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
          pointStyle: 'circle',
          padding: 18,
          font: { family: 'Inter, sans-serif', size: 15 },
          color: '#4b4f58',
        },
      },
      tooltip: {
        backgroundColor: '#2b161b',
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Inter, sans-serif', size: 14 },
        bodyFont: { family: 'Montserrat, sans-serif', size: 14 },
      },
    },
    datasets: {
      bar: {
        categoryPercentage: 0.78,
        barPercentage: 0.76,
        maxBarThickness: 64,
        borderRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#4b4f58',
          font: { family: 'Inter, sans-serif', size: 13 },
          maxRotation: 40,
          minRotation: 0,
          autoSkip: true,
          autoSkipPadding: 12,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#4b4f58',
          precision: 0,
          font: { family: 'Montserrat, sans-serif', size: 13 },
        },
        grid: { color: '#efe8ea' },
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
            servicios: this.reportes.listarServicios(consulta.desde, consulta.hasta, consulta.idEmpresa),
          }).pipe(
            tap((datos) => this.empresasFiltro.set(datos.empresas)),
            map(
              (datos): VistaDashboard => ({
                fase: 'ok',
                resumen: datos.resumen,
                empresas: datos.empresas,
                servicios: datos.servicios,
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

  private readonly sincronizarCarrusel = afterRenderEffect(() => {
    const listo = this.resumen();
    if (!listo) {
      return;
    }

    untracked(() => this.desplazarGrafico(this.indiceGrafico(), 'auto'));
  });

  private readonly vigilarAutoavance = effect((onCleanup) => {
    const listo = this.resumen() !== null;
    onCleanup(() => this.detenerCarrusel());
    if (!listo) {
      return;
    }

    untracked(() => this.programarCarrusel());
  });

  constructor() {
    this.consultaMovimiento.addEventListener('change', this.alCambiarMovimiento);
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.destroyRef.onDestroy(() => {
      this.detenerCarrusel();
      this.consultaMovimiento.removeEventListener('change', this.alCambiarMovimiento);
      document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    });
  }
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

  readonly tituloGrafico = computed(
    () => this.panelesGrafico[this.indiceGrafico()]?.titulo ?? '',
  );

  readonly subtitulo = computed(() => {
    const consulta = this.consulta();
    const rango = consulta ? etiquetaRango(consulta.desde, consulta.hasta) : '';
    return rango
      ? `Monitoreo de planificación y operación real · ${rango}`
      : 'Monitoreo de planificación y operación real';
  });

  readonly serviciosReporte = computed(() => {
    const vista = this.vista();
    return vista.fase === 'ok' ? vista.servicios : [];
  });

  private readonly instanteOperacion = computed(() => {
    this.serviciosReporte();
    return instanteChile();
  });

  readonly conteosServicio = computed(() => contarClases(this.serviciosReporte(), this.instanteOperacion()));

  readonly totalServicios = computed(() => {
    const conteos = this.conteosServicio();
    return conteos.porSalir + conteos.horaVencida + conteos.enCurso + conteos.finalizados + conteos.cancelados;
  });

  readonly serviciosEvaluables = computed(() => {
    const conteos = this.conteosServicio();
    return conteos.finalizados + conteos.cancelados + conteos.horaVencida;
  });

  readonly porcentajeServiciosFinalizados = computed(() =>
    porcentaje(this.conteosServicio().finalizados, this.serviciosEvaluables()),
  );

  readonly hayServiciosFinalizados = computed(() =>
    this.serviciosReporte().some((servicio) => servicio.estado === 'FINALIZADO'),
  );

  readonly totalesPasajeros = computed(() => totalesPasajerosFinalizados(this.serviciosReporte()));

  readonly porcentajeAsistencia = computed(() =>
    porcentaje(this.totalesPasajeros().planificadosTransportados, this.totalesPasajeros().planificados),
  );

  readonly graficoServicios = computed<ChartData<'bar'>>(() => {
    const consulta = this.consulta();
    const puntos = consulta
      ? serieServicios(this.serviciosReporte(), consulta.desde, consulta.hasta, consulta.agrupacion)
      : [];

    return {
      labels: puntos.map((punto) => etiquetaPeriodo(punto.periodo, consulta?.agrupacion ?? 'DIA')),
      datasets: [
        {
          label: 'Planificados',
          data: puntos.map((punto) => punto.planificados),
          backgroundColor: PALETA_OPERACIONAL.planificado,
        },
        {
          label: 'Finalizados',
          data: puntos.map((punto) => punto.finalizados),
          backgroundColor: PALETA_OPERACIONAL.realizado,
        },
      ],
    };
  });

  readonly graficoPersonas = computed<ChartData<'bar'>>(() => {
    const consulta = this.consulta();
    const puntos = consulta
      ? seriePasajerosFinalizados(this.serviciosReporte(), consulta.desde, consulta.hasta, consulta.agrupacion)
      : [];

    return {
      labels: puntos.map((punto) => etiquetaPeriodo(punto.periodo, consulta?.agrupacion ?? 'DIA')),
      datasets: [
        {
          label: 'Pasajeros planificados',
          data: puntos.map((punto) => punto.planificados),
          backgroundColor: PALETA_OPERACIONAL.planificado,
        },
        {
          label: 'Planificados transportados',
          data: puntos.map((punto) => punto.planificadosTransportados),
          backgroundColor: PALETA_OPERACIONAL.realizado,
        },
        {
          label: 'No planificados transportados',
          data: puntos.map((punto) => punto.noPlanificadosTransportados),
          backgroundColor: PALETA_OPERACIONAL.transportado,
        },
      ],
    };
  });

  readonly segmentosServicios = computed<DoughnutSegment[]>(() => {
    const conteos = this.conteosServicio();
    return [
      { label: 'Por salir', value: conteos.porSalir, color: PALETA_OPERACIONAL.programado },
      { label: 'Programado con hora vencida', value: conteos.horaVencida, color: PALETA_OPERACIONAL.transportado },
      { label: 'En curso', value: conteos.enCurso, color: PALETA_OPERACIONAL.enCurso },
      { label: 'Finalizados', value: conteos.finalizados, color: PALETA_OPERACIONAL.realizado },
      { label: 'Cancelados', value: conteos.cancelados, color: PALETA_OPERACIONAL.cancelado },
    ];
  });

  readonly segmentosAsistencia = computed<DoughnutSegment[]>(() => {
    const totales = this.totalesPasajeros();
    return [
      {
        label: 'Planificados transportados',
        value: totales.planificadosTransportados,
        color: PALETA_OPERACIONAL.realizado,
      },
      {
        label: 'Planificados no transportados',
        value: totales.planificadosNoTransportados,
        color: PALETA_OPERACIONAL.planificado,
      },
    ];
  });

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

  marcarPunteroCarrusel(activo: boolean): void {
    this.punteroSobreCarrusel = activo;
    this.programarCarrusel();
  }

  marcarFocoCarrusel(): void {
    this.focoEnCarrusel = true;
    this.programarCarrusel();
  }

  alSalirFocoCarrusel(evento: FocusEvent): void {
    const escenario = evento.currentTarget;
    const destino = evento.relatedTarget;
    if (escenario instanceof Node && destino instanceof Node && escenario.contains(destino)) {
      return;
    }

    this.focoEnCarrusel = false;
    this.programarCarrusel();
  }

  irAGrafico(indice: number): void {
    const ultimo = this.panelesGrafico.length - 1;
    this.desplazarGrafico(Math.max(0, Math.min(ultimo, indice)), this.movimientoGrafico());
    this.programarCarrusel();
  }

  alDesplazarGraficos(): void {
    if (this.ignorarDesplazamiento) {
      return;
    }

    const ventana = this.ventanaGraficos()?.nativeElement;
    if (!ventana || ventana.clientWidth <= 0) {
      return;
    }

    const indice = Math.round(ventana.scrollLeft / ventana.clientWidth);
    const limitado = Math.max(0, Math.min(this.panelesGrafico.length - 1, indice));
    if (limitado === this.indiceGrafico()) {
      return;
    }

    this.indiceGrafico.set(limitado);
    this.redibujarGraficos();
    this.programarCarrusel();
  }

  alTecladoGraficos(evento: KeyboardEvent): void {
    if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      this.irAGrafico(this.indiceGrafico() + 1);
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      this.irAGrafico(this.indiceGrafico() - 1);
    } else if (evento.key === 'Home') {
      evento.preventDefault();
      this.irAGrafico(0);
    } else if (evento.key === 'End') {
      evento.preventDefault();
      this.  irAGrafico(this.panelesGrafico.length - 1);
    }
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

  private readonly alCambiarMovimiento = (): void => {
    this.movimientoReducido = this.consultaMovimiento.matches;
    this.programarCarrusel();
  };

  private readonly alCambiarVisibilidad = (): void => {
    this.programarCarrusel();
  };

  private puedeAvanzarAutomaticamente(): boolean {
    return (
      !this.movimientoReducido &&
      !this.punteroSobreCarrusel &&
      !this.focoEnCarrusel &&
      !document.hidden &&
      this.resumen() !== null
    );
  }

  private programarCarrusel(): void {
    this.detenerCarrusel();
    if (!this.puedeAvanzarAutomaticamente()) {
      return;
    }

    this.temporizadorCarrusel = window.setTimeout(() => {
      this.temporizadorCarrusel = null;
      this.avanzarCarrusel();
    }, 8000);
  }

  private detenerCarrusel(): void {
    if (this.temporizadorCarrusel !== null) {
      window.clearTimeout(this.temporizadorCarrusel);
      this.temporizadorCarrusel = null;
    }
  }

  private avanzarCarrusel(): void {
    if (!this.puedeAvanzarAutomaticamente()) {
      return;
    }

    const ventana = this.ventanaGraficos()?.nativeElement;
    if (!ventana) {
      this.programarCarrusel();
      return;
    }

    const siguiente = (this.indiceGrafico() + 1) % this.panelesGrafico.length;
    this.desplazarGrafico(siguiente, this.movimientoGrafico());
    this.programarCarrusel();
  }

  private movimientoGrafico(): ScrollBehavior {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  private desplazarGrafico(indice: number, comportamiento: ScrollBehavior): void {
    const ventana = this.ventanaGraficos()?.nativeElement;
    if (!ventana) {
      return;
    }

    this.indiceGrafico.set(indice);
    const destino = indice * ventana.clientWidth;
    if (Math.abs(ventana.scrollLeft - destino) < 2) {
      this.redibujarGraficos();
      return;
    }

    this.ignorarDesplazamiento = true;
    ventana.scrollTo({ left: destino, behavior: comportamiento });
    const terminar = (): void => {
      this.ignorarDesplazamiento = false;
      this.redibujarGraficos();
    };

    if ('onscrollend' in ventana) {
      ventana.addEventListener('scrollend', terminar, { once: true });
      return;
    }

    window.setTimeout(terminar, comportamiento === 'smooth' ? 360 : 0);
  }

  private redibujarGraficos(): void {
    const ventana = this.ventanaGraficos()?.nativeElement;
    if (!ventana) {
      return;
    }

    queueMicrotask(() => {
      ventana.querySelectorAll('canvas').forEach((nodo) => {
        if (nodo instanceof HTMLCanvasElement) {
          Chart.getChart(nodo)?.resize();
        }
      });
    });
  }

}
