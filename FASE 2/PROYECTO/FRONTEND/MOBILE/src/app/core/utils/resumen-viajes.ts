export interface ViajeContable {
  fecha: string;
  realizado: boolean;
}

export interface ResumenViajes {
  total: number;
  primerViaje: string | null;
  enMesActual: number;
  ultimoViaje: string | null;
}

export function asistenciaEfectiva(estado: string | null | undefined): boolean {
  return estado === 'VALIDA';
}

export function servicioFinalizado(estado: string | null | undefined): boolean {
  return estado === 'FINALIZADO';
}

export function resumirViajes(viajes: ViajeContable[], hoy = new Date()): ResumenViajes {
  const mes = mesChile(hoy);
  const realizados = viajes
    .filter((viaje) => viaje.realizado && fechaValida(viaje.fecha))
    .map((viaje) => viaje.fecha)
    .sort();

  const primero = realizados[0] ?? null;
  const ultimo = realizados.at(-1) ?? null;

  return {
    total: realizados.length,
    primerViaje: primero,
    enMesActual: realizados.filter((fecha) => fecha.startsWith(mes)).length,
    ultimoViaje: ultimo && ultimo !== primero ? ultimo : null,
  };
}

export function mesChile(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
  }).format(fecha);

  return partes.slice(0, 7);
}

function fechaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(fecha);
}
