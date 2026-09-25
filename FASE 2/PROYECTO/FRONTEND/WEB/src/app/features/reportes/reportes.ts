import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Empresa } from '../../core/models/empresa';
import {
  ConsultaReporte,
  PeriodoReporte,
  ReporteOperacional,
  ReportePasajeroServicio,
  ReporteServicio,
  ResultadoAsistenciaReporte,
} from '../../core/models/reporte';
import { EstadoServicio } from '../../core/models/servicio';
import { EmpresasService } from '../../core/services/empresas.service';
import { ReportesService } from '../../core/services/reportes.service';
import {
  domingoDeSemana,
  formatearIso,
  hoyLocal,
  lunesDeSemana,
  parsearIso,
} from '../../core/utils/fechas';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { KpiCard } from '../../shared/components/kpi-card/kpi-card';
import { Modal } from '../../shared/components/modal/modal';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BadgeTone, StatusBadge } from '../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-reportes',
  imports: [PageHeader, ActionButton, FilterSelect, KpiCard, AppCard, StatusBadge, Modal],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesPage {
  private readonly reportesApi = inject(ReportesService);
  private readonly empresasApi = inject(EmpresasService);

  readonly opcionesPeriodo: FilterOption[] = [
    { value: 'MES', label: 'Mes' },
    { value: 'SEMANA', label: 'Semana' },
    { value: 'DIA', label: 'Día' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6, 7];

  readonly empresas = signal<Empresa[]>([]);
  readonly idEmpresa = signal('');
  readonly periodo = signal<PeriodoReporte>('MES');
  readonly mes = signal(mesActual());
  readonly fechaDia = signal(formatearIso(hoyLocal()));
  readonly fechaSemana = signal(formatearIso(hoyLocal()));

  readonly cargandoEmpresas = signal(true);
  readonly consultando = signal(false);
  readonly descargando = signal(false);
  readonly errorEmpresas = signal<string | null>(null);
  readonly errorConsulta = signal<string | null>(null);
  readonly errorDescarga = signal<string | null>(null);
  readonly errorValidacion = signal<string | null>(null);

  readonly reporte = signal<ReporteOperacional | null>(null);

  readonly pasajerosAbiertos = signal(false);
  readonly servicioPasajeros = signal<ReporteServicio | null>(null);
  readonly pasajeros = signal<ReportePasajeroServicio[]>([]);
  readonly cargandoPasajeros = signal(false);
  readonly errorPasajeros = signal<string | null>(null);

  readonly opcionesEmpresa = computed<FilterOption[]>(() =>
    this.empresas().map((empresa) => ({
      value: String(empresa.idEmpresa),
      label: empresa.razonSocial,
    })),
  );

  readonly rangoSemana = computed(() => {
    const fecha = parsearIso(this.fechaSemana());
    if (!fecha) {
      return '';
    }

    return `${formatearDdMmYyyy(lunesDeSemana(fecha))} - ${formatearDdMmYyyy(domingoDeSemana(fecha))}`;
  });

  readonly subtitulo = computed(() => {
    const reporte = this.reporte();
    if (!reporte) {
      return 'Consulta operacional por empresa y período.';
    }

    const empresa = reporte.razonSocial ?? this.nombreEmpresa(reporte.consulta.idEmpresa);
    return `${empresa} · ${this.etiquetaConsulta(reporte.consulta)}`;
  });

  readonly sinResultados = computed(() => {
    const reporte = this.reporte();
    return !!reporte && reporte.servicios.length === 0;
  });

  constructor() {
    this.empresasApi.listar().subscribe({
      next: (empresas) => {
        this.cargandoEmpresas.set(false);
        this.empresas.set(empresas);
        if (empresas.length === 1) {
          this.idEmpresa.set(String(empresas[0].idEmpresa));
        }
      },
      error: (error: unknown) => {
        this.cargandoEmpresas.set(false);
        this.errorEmpresas.set(mensajeErrorHttp(error, 'No fue posible cargar las empresas.'));
      },
    });
  }

  actualizarPeriodo(valor: string): void {
    this.periodo.set(valor as PeriodoReporte);
    this.errorValidacion.set(null);
  }

  actualizarMes(event: Event): void {
    this.mes.set((event.target as HTMLInputElement).value);
  }

  actualizarFechaDia(event: Event): void {
    this.fechaDia.set((event.target as HTMLInputElement).value);
  }

  actualizarFechaSemana(event: Event): void {
    this.fechaSemana.set((event.target as HTMLInputElement).value);
  }

  consultar(): void {
    const consulta = this.construirConsulta();
    if (!consulta || this.consultando()) {
      return;
    }

    this.consultando.set(true);
    this.errorConsulta.set(null);
    this.errorValidacion.set(null);
    this.errorDescarga.set(null);

    this.reportesApi.obtener(consulta).subscribe({
      next: (reporte) => {
        this.consultando.set(false);
        this.reporte.set(reporte);
      },
      error: (error: unknown) => {
        this.consultando.set(false);
        this.errorConsulta.set(mensajeErrorHttp(error, 'No fue posible consultar el reporte.'));
      },
    });
  }

  exportarExcel(): void {
    const consulta = this.reporte()?.consulta;
    if (!consulta || this.descargando()) {
      return;
    }

    this.descargando.set(true);
    this.errorDescarga.set(null);

    this.reportesApi.descargarExcel(consulta).subscribe({
      next: (respuesta) => {
        this.descargando.set(false);
        this.guardarArchivo(respuesta, this.nombreExcel(consulta));
      },
      error: (error: unknown) => {
        this.descargando.set(false);
        this.errorDescarga.set(mensajeErrorHttp(error, 'No fue posible descargar el Excel.'));
      },
    });
  }

  verPasajeros(servicio: ReporteServicio): void {
    this.servicioPasajeros.set(servicio);
    this.pasajeros.set([]);
    this.errorPasajeros.set(null);
    this.pasajerosAbiertos.set(true);
    this.cargandoPasajeros.set(true);

    this.reportesApi.listarPasajeros(servicio.idServicio).subscribe({
      next: (pasajeros) => {
        this.cargandoPasajeros.set(false);
        this.pasajeros.set(pasajeros);
      },
      error: (error: unknown) => {
        this.cargandoPasajeros.set(false);
        this.errorPasajeros.set(mensajeErrorHttp(error, 'No fue posible cargar los pasajeros.'));
      },
    });
  }

  cerrarPasajeros(): void {
    this.pasajerosAbiertos.set(false);
    this.servicioPasajeros.set(null);
    this.pasajeros.set([]);
    this.errorPasajeros.set(null);
  }

  tituloPasajeros(): string {
    const servicio = this.servicioPasajeros();
    return servicio ? `Pasajeros · Servicio #${servicio.idServicio}` : 'Pasajeros';
  }

  formatoEntero(valor: number): string {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valor);
  }

  formatearFecha(fecha: string): string {
    const iso = fecha.slice(0, 10);
    const partes = iso.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
  }

  formatearHorario(horaInicio: string, horaFin: string): string {
    return `${this.formatearHora(horaInicio)} – ${this.formatearHora(horaFin)}`;
  }

  formatearHora(valor: string): string {
    return valor.length >= 5 ? valor.slice(0, 5) : valor;
  }

  formatearFechaHora(valor: string | null): string {
    if (!valor) {
      return '-';
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

  tonoEstado(estado: EstadoServicio): BadgeTone {
    switch (estado) {
      case 'PROGRAMADO':
        return 'amber';
      case 'EN_CURSO':
        return 'green';
      case 'FINALIZADO':
        return 'sky';
      case 'CANCELADO':
        return 'red';
    }
  }

  etiquetaEstado(estado: EstadoServicio): string {
    return estado === 'EN_CURSO' ? 'EN CURSO' : estado;
  }

  tonoResultado(resultado: ResultadoAsistenciaReporte): BadgeTone {
    switch (resultado) {
      case 'PRESENTE':
        return 'green';
      case 'AUSENTE':
        return 'amber';
      case 'ANULADA':
        return 'red';
      case 'PROVISIONAL':
        return 'sky';
    }
  }

  textoOpcional(valor: string | null | undefined): string {
    return valor?.trim() ? valor : '-';
  }

  private construirConsulta(): ConsultaReporte | null {
    const idEmpresa = Number(this.idEmpresa());
    if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
      this.errorValidacion.set('Seleccione una empresa.');
      return null;
    }

    const periodo = this.periodo();
    if (periodo === 'MES') {
      const mes = this.mes();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
        this.errorValidacion.set('Seleccione un mes válido.');
        return null;
      }

      return { tipo: 'MES', idEmpresa, periodo: mes };
    }

    if (periodo === 'DIA') {
      const fecha = this.fechaDia();
      if (!parsearIso(fecha)) {
        this.errorValidacion.set('Seleccione una fecha válida.');
        return null;
      }

      return { tipo: 'DIA', idEmpresa, desde: fecha, hasta: fecha };
    }

    const fecha = parsearIso(this.fechaSemana());
    if (!fecha) {
      this.errorValidacion.set('Seleccione una fecha válida de la semana.');
      return null;
    }

    return {
      tipo: 'SEMANA',
      idEmpresa,
      desde: formatearIso(lunesDeSemana(fecha)),
      hasta: formatearIso(domingoDeSemana(fecha)),
    };
  }

  private etiquetaConsulta(consulta: ConsultaReporte): string {
    if (consulta.tipo === 'MES') {
      return consulta.periodo;
    }

    if (consulta.tipo === 'DIA') {
      return this.formatearFecha(consulta.desde);
    }

    return `${this.formatearFecha(consulta.desde)} - ${this.formatearFecha(consulta.hasta)}`;
  }

  private nombreEmpresa(idEmpresa: number): string {
    return this.empresas().find((empresa) => empresa.idEmpresa === idEmpresa)?.razonSocial ?? 'Empresa';
  }

  private nombreExcel(consulta: ConsultaReporte): string {
    const empresa = sanitizarNombreArchivo(
      this.reporte()?.razonSocial ?? this.nombreEmpresa(consulta.idEmpresa),
    );

    if (consulta.tipo === 'MES') {
      return `reporte_${empresa}_${consulta.periodo}.xlsx`;
    }

    return `reporte_${empresa}_${consulta.desde}_${consulta.hasta}.xlsx`;
  }

  private guardarArchivo(respuesta: HttpResponse<Blob>, fallback: string): void {
    const blob = respuesta.body;
    if (!blob) {
      this.errorDescarga.set('No fue posible descargar el Excel.');
      return;
    }

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreDesdeContentDisposition(respuesta.headers.get('Content-Disposition'), fallback);
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

function mesActual(): string {
  const hoy = hoyLocal();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function formatearDdMmYyyy(fecha: Date): string {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

function sanitizarNombreArchivo(valor: string): string {
  const limpio = valor
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_');
  return limpio || 'Empresa';
}

function nombreDesdeContentDisposition(header: string | null, fallback: string): string {
  if (!header) {
    return fallback;
  }

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return fallback;
    }
  }

  const simple = /filename="?([^"]+)"?/i.exec(header);
  return simple?.[1] ?? fallback;
}
