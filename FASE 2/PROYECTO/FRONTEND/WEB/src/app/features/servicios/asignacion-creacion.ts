export type ClaseErrorAsignacion = 'ya-existia' | 'horario' | 'otro';

export function clasificarErrorAsignacion(status: number, mensaje: string): ClaseErrorAsignacion {
  if (status !== 409) {
    return 'otro';
  }

  const texto = mensaje.trim().toLowerCase();
  if (texto.includes('el servicio ya tiene una asignación activa')) {
    return 'ya-existia';
  }

  if (texto.includes('horario superpuesto')) {
    return 'horario';
  }

  return 'otro';
}

export function mensajeCuerpo(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const cuerpo = (error as { error?: unknown }).error;
  if (typeof cuerpo === 'string') {
    return cuerpo;
  }

  if (cuerpo && typeof cuerpo === 'object' && 'mensaje' in cuerpo && typeof cuerpo.mensaje === 'string') {
    return cuerpo.mensaje;
  }

  return '';
}

export function idsPendientes(creados: readonly number[], asignados: readonly number[]): number[] {
  const listos = new Set(asignados);
  const pendientes: number[] = [];
  for (const id of creados) {
    if (!Number.isInteger(id) || id <= 0 || listos.has(id)) {
      continue;
    }

    listos.add(id);
    pendientes.push(id);
  }

  return pendientes;
}
