import { AgrupacionEvolucion, PeriodoRapido } from '../models/dashboard';

export function hoyLocal(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

export function formatearIso(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function parsearIso(iso: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!partes) {
    return null;
  }

  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(anio, mes - 1, dia);

  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }

  return fecha;
}

export function lunesDeSemana(fecha: Date): Date {
  const local = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const dia = local.getDay();
  const desplazamiento = dia === 0 ? -6 : 1 - dia;
  local.setDate(local.getDate() + desplazamiento);
  return local;
}

export function domingoDeSemana(fecha: Date): Date {
  const lunes = lunesDeSemana(fecha);
  return new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
}

export function primerDiaMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

export function ultimoDiaMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
}

export function rangoPeriodo(
  periodo: PeriodoRapido,
  desdePersonalizado: string,
  hastaPersonalizado: string,
): { desde: string; hasta: string } {
  const hoy = hoyLocal();

  if (periodo === 'hoy') {
    const iso = formatearIso(hoy);
    return { desde: iso, hasta: iso };
  }

  if (periodo === 'semana') {
    return { desde: formatearIso(lunesDeSemana(hoy)), hasta: formatearIso(domingoDeSemana(hoy)) };
  }

  if (periodo === 'mes') {
    return { desde: formatearIso(primerDiaMes(hoy)), hasta: formatearIso(ultimoDiaMes(hoy)) };
  }

  return {
    desde: desdePersonalizado,
    hasta: hastaPersonalizado,
  };
}

export function diasInclusive(desdeIso: string, hastaIso: string): number {
  const desde = parsearIso(desdeIso);
  const hasta = parsearIso(hastaIso);
  if (!desde || !hasta) {
    return 0;
  }

  return Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1;
}

export function agrupacionParaRango(
  periodo: PeriodoRapido,
  desde: string,
  hasta: string,
): AgrupacionEvolucion {
  if (periodo === 'mes') {
    return 'SEMANA';
  }

  if (periodo === 'hoy' || periodo === 'semana') {
    return 'DIA';
  }

  return diasInclusive(desde, hasta) <= 14 ? 'DIA' : 'SEMANA';
}

export function etiquetaRango(desdeIso: string, hastaIso: string): string {
  const desde = parsearIso(desdeIso);
  const hasta = parsearIso(hastaIso);
  if (!desde || !hasta) {
    return '';
  }

  if (desdeIso === hastaIso) {
    return formatearEtiqueta(desde, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const mismoAnio = desde.getFullYear() === hasta.getFullYear();
  const izquierda = formatearEtiqueta(desde, {
    day: 'numeric',
    month: 'short',
    year: mismoAnio ? undefined : 'numeric',
  });
  const derecha = formatearEtiqueta(hasta, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${izquierda} – ${derecha}`;
}

export function etiquetaPeriodo(iso: string, agrupacion: AgrupacionEvolucion): string {
  const fecha = parsearIso(iso);
  if (!fecha) {
    return iso;
  }

  if (agrupacion === 'SEMANA') {
    const fin = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 6);
    return `${formatearEtiqueta(fecha, { day: 'numeric', month: 'short' })} – ${formatearEtiqueta(fin, { day: 'numeric', month: 'short' })}`;
  }

  return formatearEtiqueta(fecha, { day: 'numeric', month: 'short' });
}

function formatearEtiqueta(fecha: Date, opciones: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-CL', opciones).format(fecha);
}
