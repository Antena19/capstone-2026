const ZONA_CHILE = 'America/Santiago';

export type SeparadorFecha = '/' | '-';

interface PartesInstante {
  dia: string;
  mes: string;
  anio: string;
  hora: string;
  minuto: string;
}

function tieneZona(valor: string): boolean {
  return /[zZ]$/.test(valor) || /[+-]\d{2}:?\d{2}$/.test(valor);
}

/**
 * Interpreta un instante UTC entregado por la API.
 * Un valor sin zona se toma como UTC. Un offset explícito se respeta.
 * Una fecha civil AAAA-MM-DD no es un instante y no se convierte.
 */
export function interpretarInstanteUtc(valor: string): Date | null {
  const texto = valor.trim();
  if (!texto || /^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return null;
  }

  let normalizado = texto.includes('T') ? texto : texto.replace(' ', 'T');
  normalizado = normalizado.replace(/(\.\d{3})\d+/, '$1');
  if (!tieneZona(normalizado)) {
    normalizado = `${normalizado}Z`;
  }

  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function partesEnChile(fecha: Date): PartesInstante | null {
  const formato = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_CHILE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const mapa = new Map(formato.formatToParts(fecha).map((parte) => [parte.type, parte.value]));
  const dia = mapa.get('day');
  const mes = mapa.get('month');
  const anio = mapa.get('year');
  const hora = mapa.get('hour');
  const minuto = mapa.get('minute');
  if (!dia || !mes || !anio || !hora || !minuto) {
    return null;
  }

  return {
    dia,
    mes,
    anio,
    hora: hora === '24' ? '00' : hora,
    minuto,
  };
}

export function formatearFechaInstanteChile(
  valor: string | null | undefined,
  separador: SeparadorFecha = '/',
): string | null {
  if (!valor?.trim()) {
    return null;
  }

  const fecha = interpretarInstanteUtc(valor);
  const partes = fecha ? partesEnChile(fecha) : null;
  if (!partes) {
    return null;
  }

  return `${partes.dia}${separador}${partes.mes}${separador}${partes.anio}`;
}

export function formatearHoraInstanteChile(valor: string | null | undefined): string | null {
  if (!valor?.trim()) {
    return null;
  }

  const fecha = interpretarInstanteUtc(valor);
  const partes = fecha ? partesEnChile(fecha) : null;
  if (!partes) {
    return null;
  }

  return `${partes.hora}:${partes.minuto}`;
}

export function formatearFechaHoraInstanteChile(
  valor: string | null | undefined,
  separador: SeparadorFecha = '/',
): string | null {
  const fecha = formatearFechaInstanteChile(valor, separador);
  const hora = formatearHoraInstanteChile(valor);
  if (!fecha || !hora) {
    return null;
  }

  return `${fecha} ${hora}`;
}
