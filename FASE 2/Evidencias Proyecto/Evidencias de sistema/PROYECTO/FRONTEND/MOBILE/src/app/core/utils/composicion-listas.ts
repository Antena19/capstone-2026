export interface VistaServicios<T> {
  operativos: T[];
  pendientes: T[];
  finalizadosHoy: T[];
  historial: T[];
}

export interface ActualizacionVistaServicios<T> {
  desdeHoy: readonly T[];
  anteriores: readonly T[];
  historialConsultado: readonly T[] | null;
  hoy: string;
  id: (servicio: T) => number;
  estado: (servicio: T) => string;
  fecha: (servicio: T) => string;
}

export function excluirCancelados<T>(
  servicios: readonly T[],
  estado: (servicio: T) => string,
): T[] {
  return servicios.filter((servicio) => estado(servicio) !== 'CANCELADO');
}

export function soloFinalizados<T>(
  servicios: readonly T[],
  estado: (servicio: T) => string,
): T[] {
  return servicios.filter((servicio) => estado(servicio) === 'FINALIZADO');
}

export function ocultarDestacado<T>(
  servicios: readonly T[],
  id: (servicio: T) => number,
  idDestacado: number | null | undefined,
): T[] {
  if (idDestacado == null) {
    return [...servicios];
  }

  return servicios.filter((servicio) => id(servicio) !== idDestacado);
}

export function actualizarVistaServicios<T>(
  anterior: VistaServicios<T>,
  entrada: ActualizacionVistaServicios<T>,
): VistaServicios<T> {
  const operativos = entrada.desdeHoy.filter((servicio) => esOperativo(entrada.estado(servicio)));
  const finalizadosHoy = soloFinalizados(entrada.desdeHoy, entrada.estado);
  const idsOperativos = new Set(operativos.map(entrada.id));
  const pendientes = entrada.anteriores.filter((servicio) => {
    const valor = entrada.estado(servicio);
    return (
      entrada.fecha(servicio) < entrada.hoy &&
      !idsOperativos.has(entrada.id(servicio)) &&
      (valor === 'PROGRAMADO' || valor === 'EN_CURSO')
    );
  });
  const excluir = new Set<number>([...idsOperativos, ...pendientes.map(entrada.id)]);
  const consultado = entrada.historialConsultado ?? anterior.historial;
  const historial = unirSinDuplicar(
    [finalizadosHoy, consultado],
    entrada.id,
    (servicio) => entrada.estado(servicio) === 'FINALIZADO' && !excluir.has(entrada.id(servicio)),
  );

  return { operativos, pendientes, finalizadosHoy, historial };
}

function esOperativo(estado: string): boolean {
  return estado === 'PROGRAMADO' || estado === 'EN_CURSO';
}

function unirSinDuplicar<T>(
  fuentes: readonly (readonly T[])[],
  id: (servicio: T) => number,
  incluir: (servicio: T) => boolean,
): T[] {
  const vistos = new Set<number>();
  const resultado: T[] = [];
  for (const fuente of fuentes) {
    for (const servicio of fuente) {
      const clave = id(servicio);
      if (vistos.has(clave) || !incluir(servicio)) {
        continue;
      }

      vistos.add(clave);
      resultado.push(servicio);
    }
  }

  return resultado;
}
