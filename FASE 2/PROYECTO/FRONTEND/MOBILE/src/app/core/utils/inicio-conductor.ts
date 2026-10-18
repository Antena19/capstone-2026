export type DisponibilidadInicio = 'antes' | 'disponible' | 'vencido';

const ANTICIPACION_SEGUNDOS = 30 * 60;
const LIMITE_POSTERIOR_SEGUNDOS = 30 * 60;

/**
 * Compara la hora programada con un reloj de pared.
 * La ventana es [inicio − 30 min, inicio + 30 min].
 */
export function evaluarInicioPorReloj(
  fechaServicio: string,
  horaInicio: string,
  fechaAhora: string,
  horaAhora: string,
): DisponibilidadInicio {
  const inicio = aSegundos(fechaServicio, horaInicio);
  const ahora = aSegundos(fechaAhora, horaAhora);
  if (ahora < inicio - ANTICIPACION_SEGUNDOS) {
    return 'antes';
  }

  if (ahora <= inicio + LIMITE_POSTERIOR_SEGUNDOS) {
    return 'disponible';
  }

  return 'vencido';
}

export function evaluarInicioConductor(
  fechaServicio: string,
  horaInicio: string,
  ahora = new Date(),
): DisponibilidadInicio {
  const reloj = relojChile(ahora);
  return evaluarInicioPorReloj(fechaServicio, horaInicio, reloj.fecha, reloj.hora);
}

export function horaAperturaInicio(horaInicio: string): string {
  const apertura = aSegundos('2000-01-02', horaInicio) - ANTICIPACION_SEGUNDOS;
  const instante = new Date(apertura * 1000);
  const horas = String(instante.getUTCHours()).padStart(2, '0');
  const minutos = String(instante.getUTCMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function aSegundos(fecha: string, hora: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas = 0, minutos = 0, segundos = 0] = hora.split(':').map(Number);
  return Math.floor(Date.UTC(anio, (mes || 1) - 1, dia || 1, horas, minutos, segundos) / 1000);
}

function relojChile(ahora: Date): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ahora);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  const hora = valor('hour') === '24' ? '00' : valor('hour');
  return {
    fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
    hora: `${hora}:${valor('minute')}:${valor('second')}`,
  };
}
