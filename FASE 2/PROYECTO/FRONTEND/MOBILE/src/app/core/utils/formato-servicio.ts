import { EstadoAsistencia, EstadoConfirmacionViaje, EstadoServicio, TipoParticipacionConductor } from '../models/conductor';

const ETIQUETAS_ESTADO: Record<EstadoServicio, string> = {
  PROGRAMADO: 'Programado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

const COLORES_ESTADO: Record<EstadoServicio, string> = {
  PROGRAMADO: 'primary',
  EN_CURSO: 'success',
  FINALIZADO: 'medium',
  CANCELADO: 'danger',
};

export function fechaLocalHoy(fecha = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function fechaLocalDesplazada(dias: number, fecha = new Date()): string {
  const copia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  copia.setDate(copia.getDate() + dias);
  return fechaLocalHoy(copia);
}

export function formatearFechaChile(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) {
    return fecha;
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(anio, mes - 1, dia));
}

export function formatearHoraPlanificada(hora: string): string {
  const valor = hora.trim();
  return valor.length >= 5 ? valor.slice(0, 5) : valor;
}

function timestampTieneZona(valor: string): boolean {
  return /[zZ]$/.test(valor) || /[+-]\d{2}:?\d{2}$/.test(valor);
}

function instanteUtc(iso: string): Date | null {
  const texto = iso.trim();
  if (!texto) {
    return null;
  }

  const normalizado = timestampTieneZona(texto) ? texto : `${texto}Z`;
  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearHoraChile(iso: string): string {
  const fecha = instanteUtc(iso);
  if (!fecha) {
    return iso;
  }

  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Santiago',
  }).format(fecha);
}

export function formatearFechaHoraLocal(iso: string): string {
  const fecha = instanteUtc(iso);
  if (!fecha) {
    return iso;
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Santiago',
  }).format(fecha);
}

export function etiquetaEstadoServicio(estado: string): string {
  return ETIQUETAS_ESTADO[estado as EstadoServicio] ?? estado;
}

export function colorEstadoServicio(estado: string): string {
  return COLORES_ESTADO[estado as EstadoServicio] ?? 'medium';
}

export function tieneTexto(valor: string | null | undefined): boolean {
  return (valor ?? '').trim().length > 0;
}

const ETIQUETAS_ASISTENCIA: Record<EstadoAsistencia, string> = {
  VALIDA: 'Asistencia registrada',
  PROVISIONAL: 'Asistencia pendiente',
  ANULADA: 'Asistencia anulada',
};

const COLORES_ASISTENCIA: Record<EstadoAsistencia, string> = {
  VALIDA: 'success',
  PROVISIONAL: 'warning',
  ANULADA: 'medium',
};

export function etiquetaEstadoAsistencia(estado: EstadoAsistencia | null | undefined): string {
  if (!estado) {
    return 'Sin asistencia';
  }

  return ETIQUETAS_ASISTENCIA[estado] ?? 'Sin asistencia';
}

export function colorEstadoAsistencia(estado: EstadoAsistencia | null | undefined): string {
  if (!estado) {
    return 'medium';
  }

  return COLORES_ASISTENCIA[estado] ?? 'medium';
}

export function etiquetaParticipacion(tipo: TipoParticipacionConductor): string {
  return tipo === 'NO_PLANIFICADO' ? 'No planificado' : 'Planificado';
}

export function etiquetaConfirmacion(estado: EstadoConfirmacionViaje | null | undefined): string | null {
  if (estado === 'CONFIRMADO') {
    return 'Confirmado';
  }

  if (estado === 'PENDIENTE') {
    return 'Pendiente';
  }

  if (estado === 'RECHAZADO') {
    return 'Rechazado';
  }

  return null;
}

export function colorConfirmacion(estado: EstadoConfirmacionViaje | null | undefined): string {
  if (estado === 'CONFIRMADO') {
    return 'success';
  }

  if (estado === 'RECHAZADO') {
    return 'danger';
  }

  return 'medium';
}

export function textoPuntoRecogida(
  nombre: string | null | undefined,
  referencia: string | null | undefined,
): string | null {
  if (tieneTexto(nombre)) {
    return `Recogida: ${nombre?.trim()}`;
  }

  if (tieneTexto(referencia)) {
    return `Recogida: ${referencia?.trim()}`;
  }

  return null;
}

export function referenciaPuntoAporta(
  nombre: string | null | undefined,
  referencia: string | null | undefined,
): string | null {
  const valor = (referencia ?? '').trim();
  if (!valor) {
    return null;
  }

  const nombreNormalizado = (nombre ?? '').trim().toLowerCase();
  if (nombreNormalizado && valor.toLowerCase() === nombreNormalizado) {
    return null;
  }

  return valor;
}

export function etiquetaAsistenciaListado(
  tieneAsistencia: boolean,
  estado: EstadoAsistencia | null | undefined,
): string | null {
  if (estado === 'VALIDA' && tieneAsistencia) {
    return 'Asistencia registrada';
  }

  if (estado === 'ANULADA') {
    return 'Asistencia anulada';
  }

  return null;
}

export function etiquetaTipoAsistencia(tipo: string | null | undefined): string | null {
  if (tipo === 'PLANIFICADA') {
    return 'Planificada';
  }

  if (tipo === 'NO_PLANIFICADA') {
    return 'No planificada';
  }

  return null;
}

export function etiquetaMetodoAsistencia(metodo: string | null | undefined): string | null {
  if (metodo === 'QR') {
    return 'Código QR';
  }

  if (metodo === 'MANUAL') {
    return 'Manual';
  }

  return null;
}
