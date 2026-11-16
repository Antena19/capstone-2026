import { AgrupacionEvolucion } from '../../core/models/dashboard';
import { ReporteServicio } from '../../core/models/reporte';
import { formatearIso, lunesDeSemana, parsearIso } from '../../core/utils/fechas';

const ZONA_CHILE = 'America/Santiago';

export type ClaseServicio = 'por-salir' | 'hora-vencida' | 'en-curso' | 'finalizado' | 'cancelado';

export interface InstanteChile {
  fecha: string;
  minutos: number;
}

export interface ConteosServicio {
  porSalir: number;
  horaVencida: number;
  enCurso: number;
  finalizados: number;
  cancelados: number;
}

export interface TotalesPasajerosFinalizados {
  planificados: number;
  planificadosTransportados: number;
  planificadosNoTransportados: number;
  noPlanificadosTransportados: number;
}

export interface PuntoServicios {
  periodo: string;
  planificados: number;
  finalizados: number;
}

export interface PuntoPasajeros {
  periodo: string;
  planificados: number;
  planificadosTransportados: number;
  noPlanificadosTransportados: number;
}

export function instanteChile(momento = new Date()): InstanteChile {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_CHILE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(momento);

  const tomar = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  let hora = tomar('hour');
  if (hora === '24') {
    hora = '00';
  }

  return {
    fecha: `${tomar('year')}-${tomar('month')}-${tomar('day')}`,
    minutos: Number(hora) * 60 + Number(tomar('minute')),
  };
}

export function clasificarServicio(servicio: ReporteServicio, ahora: InstanteChile): ClaseServicio {
  if (servicio.estado === 'EN_CURSO') {
    return 'en-curso';
  }

  if (servicio.estado === 'FINALIZADO') {
    return 'finalizado';
  }

  if (servicio.estado === 'CANCELADO') {
    return 'cancelado';
  }

  return inicioYaPaso(servicio.fecha, servicio.horaInicio, ahora) ? 'hora-vencida' : 'por-salir';
}

export function contarClases(servicios: ReporteServicio[], ahora: InstanteChile): ConteosServicio {
  const conteos: ConteosServicio = {
    porSalir: 0,
    horaVencida: 0,
    enCurso: 0,
    finalizados: 0,
    cancelados: 0,
  };

  for (const servicio of servicios) {
    const clase = clasificarServicio(servicio, ahora);
    if (clase === 'por-salir') {
      conteos.porSalir += 1;
    } else if (clase === 'hora-vencida') {
      conteos.horaVencida += 1;
    } else if (clase === 'en-curso') {
      conteos.enCurso += 1;
    } else if (clase === 'finalizado') {
      conteos.finalizados += 1;
    } else {
      conteos.cancelados += 1;
    }
  }

  return conteos;
}

export function totalesPasajerosFinalizados(servicios: ReporteServicio[]): TotalesPasajerosFinalizados {
  const totales: TotalesPasajerosFinalizados = {
    planificados: 0,
    planificadosTransportados: 0,
    planificadosNoTransportados: 0,
    noPlanificadosTransportados: 0,
  };

  for (const servicio of servicios) {
    if (servicio.estado !== 'FINALIZADO') {
      continue;
    }

    totales.planificados += servicio.personasPlanificadas;
    totales.planificadosTransportados += servicio.planificadosTransportados;
    totales.planificadosNoTransportados += servicio.planificadosNoTransportados;
    totales.noPlanificadosTransportados += servicio.noPlanificadosTransportados;
  }

  return totales;
}

export function porcentaje(numerador: number, denominador: number): number | null {
  if (denominador <= 0) {
    return null;
  }

  return Math.round((numerador * 10000) / denominador) / 100;
}

export function serieServicios(
  servicios: ReporteServicio[],
  desde: string,
  hasta: string,
  agrupacion: AgrupacionEvolucion,
): PuntoServicios[] {
  const puntos = new Map<string, PuntoServicios>();
  for (const periodo of periodosRango(desde, hasta, agrupacion)) {
    puntos.set(periodo, { periodo, planificados: 0, finalizados: 0 });
  }

  for (const servicio of servicios) {
    const periodo = clavePeriodo(servicio.fecha, agrupacion);
    const punto = puntos.get(periodo) ?? { periodo, planificados: 0, finalizados: 0 };
    punto.planificados += 1;
    if (servicio.estado === 'FINALIZADO') {
      punto.finalizados += 1;
    }
    puntos.set(periodo, punto);
  }

  return periodosRango(desde, hasta, agrupacion).map(
    (periodo) => puntos.get(periodo) ?? { periodo, planificados: 0, finalizados: 0 },
  );
}

export function seriePasajerosFinalizados(
  servicios: ReporteServicio[],
  desde: string,
  hasta: string,
  agrupacion: AgrupacionEvolucion,
): PuntoPasajeros[] {
  const puntos = new Map<string, PuntoPasajeros>();
  for (const periodo of periodosRango(desde, hasta, agrupacion)) {
    puntos.set(periodo, {
      periodo,
      planificados: 0,
      planificadosTransportados: 0,
      noPlanificadosTransportados: 0,
    });
  }

  for (const servicio of servicios) {
    if (servicio.estado !== 'FINALIZADO') {
      continue;
    }

    const periodo = clavePeriodo(servicio.fecha, agrupacion);
    const punto = puntos.get(periodo) ?? {
      periodo,
      planificados: 0,
      planificadosTransportados: 0,
      noPlanificadosTransportados: 0,
    };
    punto.planificados += servicio.personasPlanificadas;
    punto.planificadosTransportados += servicio.planificadosTransportados;
    punto.noPlanificadosTransportados += servicio.noPlanificadosTransportados;
    puntos.set(periodo, punto);
  }

  return periodosRango(desde, hasta, agrupacion).map(
    (periodo) =>
      puntos.get(periodo) ?? {
        periodo,
        planificados: 0,
        planificadosTransportados: 0,
        noPlanificadosTransportados: 0,
      },
  );
}

function inicioYaPaso(fecha: string, horaInicio: string, ahora: InstanteChile): boolean {
  const dia = fecha.slice(0, 10);
  if (dia < ahora.fecha) {
    return true;
  }

  if (dia > ahora.fecha) {
    return false;
  }

  const minutos = minutosDeHora(horaInicio);
  if (minutos === null) {
    return false;
  }

  return minutos <= ahora.minutos;
}

function minutosDeHora(hora: string): number | null {
  const coincidencia = /^(\d{2}):(\d{2})/.exec(hora.trim());
  if (!coincidencia) {
    return null;
  }

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  if (horas > 23 || minutos > 59) {
    return null;
  }

  return horas * 60 + minutos;
}

function clavePeriodo(fechaIso: string, agrupacion: AgrupacionEvolucion): string {
  const dia = fechaIso.slice(0, 10);
  if (agrupacion === 'DIA') {
    return dia;
  }

  const fecha = parsearIso(dia);
  if (!fecha) {
    return dia;
  }

  return formatearIso(lunesDeSemana(fecha));
}

function periodosRango(desde: string, hasta: string, agrupacion: AgrupacionEvolucion): string[] {
  const inicio = parsearIso(desde);
  const fin = parsearIso(hasta);
  if (!inicio || !fin || inicio > fin) {
    return [];
  }

  if (agrupacion === 'DIA') {
    const claves: string[] = [];
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const limite = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
    while (cursor <= limite) {
      claves.push(formatearIso(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return claves;
  }

  const claves: string[] = [];
  let semana = lunesDeSemana(inicio);
  const ultima = lunesDeSemana(fin);
  while (semana <= ultima) {
    claves.push(formatearIso(semana));
    semana = new Date(semana.getFullYear(), semana.getMonth(), semana.getDate() + 7);
  }
  return claves;
}
