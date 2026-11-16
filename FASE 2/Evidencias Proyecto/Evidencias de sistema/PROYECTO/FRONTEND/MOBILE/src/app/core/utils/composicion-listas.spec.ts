import { describe, expect, it } from 'vitest';
import { INTERVALO_REFRESCO_OPERATIVO_MS } from './refresco-operativo';
import {
  ActualizacionVistaServicios,
  VistaServicios,
  actualizarVistaServicios,
  excluirCancelados,
  ocultarDestacado,
  soloFinalizados,
} from './composicion-listas';

interface ServicioPrueba {
  id: number;
  fecha: string;
  estado: string;
}

const HOY = '2026-10-18';

const vacia: VistaServicios<ServicioPrueba> = {
  operativos: [],
  pendientes: [],
  finalizadosHoy: [],
  historial: [],
};

describe('exclusión de cancelados', () => {
  const servicios: ServicioPrueba[] = [
    { id: 1, fecha: HOY, estado: 'PROGRAMADO' },
    { id: 2, fecha: HOY, estado: 'EN_CURSO' },
    { id: 3, fecha: HOY, estado: 'FINALIZADO' },
    { id: 4, fecha: HOY, estado: 'CANCELADO' },
    { id: 5, fecha: '2026-10-19', estado: 'CANCELADO' },
    { id: 6, fecha: '2026-10-19', estado: 'PROGRAMADO' },
  ];

  it('nunca incluye un servicio cancelado', () => {
    const visibles = excluirCancelados(servicios, (servicio) => servicio.estado);

    expect(visibles.map((servicio) => servicio.id)).toEqual([1, 2, 3, 6]);
    expect(visibles.some((servicio) => servicio.estado === 'CANCELADO')).toBe(false);
  });
});

describe('historial', () => {
  const servicios: ServicioPrueba[] = [
    { id: 7, fecha: '2026-10-17', estado: 'FINALIZADO' },
    { id: 8, fecha: '2026-10-16', estado: 'CANCELADO' },
    { id: 9, fecha: '2026-10-15', estado: 'PROGRAMADO' },
    { id: 10, fecha: HOY, estado: 'FINALIZADO' },
  ];

  const historial = soloFinalizados(servicios, (servicio) => servicio.estado);

  it('conserva los servicios finalizados', () => {
    expect(historial.map((servicio) => servicio.id)).toEqual([7, 10]);
  });

  it('no muestra cancelados ni otros estados', () => {
    expect(historial.some((servicio) => servicio.estado === 'CANCELADO')).toBe(false);
    expect(historial.every((servicio) => servicio.estado === 'FINALIZADO')).toBe(true);
  });
});

describe('organización de hoy, pendientes e historial', () => {
  const desdeHoy: ServicioPrueba[] = [
    { id: 54, fecha: HOY, estado: 'FINALIZADO' },
    { id: 60, fecha: HOY, estado: 'EN_CURSO' },
    { id: 61, fecha: HOY, estado: 'PROGRAMADO' },
    { id: 62, fecha: HOY, estado: 'CANCELADO' },
    { id: 63, fecha: '2026-10-19', estado: 'PROGRAMADO' },
  ];
  const anteriores: ServicioPrueba[] = [
    { id: 40, fecha: '2026-10-17', estado: 'FINALIZADO' },
    { id: 41, fecha: '2026-10-16', estado: 'PROGRAMADO' },
    { id: 42, fecha: '2026-10-15', estado: 'EN_CURSO' },
    { id: 43, fecha: '2026-10-14', estado: 'CANCELADO' },
  ];

  it('deja PROGRAMADO y EN_CURSO en las listas operativas', () => {
    const vista = componer(vacia, desdeHoy, anteriores, null);

    expect(ids(vista.operativos)).toEqual([60, 61, 63]);
    expect(ids(vista.pendientes)).toEqual([41, 42]);
  });

  it('lleva el finalizado de hoy al historial y oculta el cancelado', () => {
    const vista = componer(vacia, desdeHoy, anteriores, null);

    expect(ids(vista.operativos)).not.toContain(54);
    expect(ids(vista.pendientes)).not.toContain(54);
    expect(ids(vista.finalizadosHoy)).toEqual([54]);
    expect(ids(vista.historial)).toEqual([54]);
    expect(ids(vista.historial)).not.toContain(62);
    expect(ids(vista.pendientes)).not.toContain(43);
    expect(vista.operativos.some((servicio) => servicio.estado === 'CANCELADO')).toBe(false);
    expect(vista.historial.some((servicio) => servicio.estado === 'CANCELADO')).toBe(false);
  });

  it('conserva el finalizado de un día anterior cuando llega la consulta del historial', () => {
    const conHoy = componer(vacia, desdeHoy, anteriores, null);
    const vista = componer(conHoy, desdeHoy, anteriores, [
      { id: 40, fecha: '2026-10-17', estado: 'FINALIZADO' },
      { id: 43, fecha: '2026-10-14', estado: 'CANCELADO' },
      { id: 41, fecha: '2026-10-16', estado: 'PROGRAMADO' },
      { id: 54, fecha: HOY, estado: 'FINALIZADO' },
    ]);

    expect(ids(vista.historial)).toEqual([54, 40]);
    expect(ids(vista.operativos)).toEqual([60, 61, 63]);
    expect(ids(vista.pendientes)).toEqual([41, 42]);
  });

  it('no duplica el servicio destacado ni un finalizado que ya está en el historial', () => {
    const vista = componer(vacia, desdeHoy, anteriores, [
      { id: 54, fecha: HOY, estado: 'FINALIZADO' },
      { id: 40, fecha: '2026-10-17', estado: 'FINALIZADO' },
    ]);
    const visibles = ocultarDestacado(vista.operativos, (servicio) => servicio.id, 60);
    const pendientesVisibles = ocultarDestacado(vista.pendientes, (servicio) => servicio.id, 42);

    expect(ids(visibles)).toEqual([61, 63]);
    expect(ids(pendientesVisibles)).toEqual([41]);
    expect(ids(vista.historial)).toEqual([54, 40]);
    expect(new Set([...ids(visibles), ...ids(pendientesVisibles), ...ids(vista.historial)]).size).toBe(
      ids(visibles).length + ids(pendientesVisibles).length + ids(vista.historial).length,
    );
  });
});

describe('refresco automático', () => {
  it('usa el intervalo de 30 segundos', () => {
    expect(INTERVALO_REFRESCO_OPERATIVO_MS).toBe(30_000);
  });

  it('al repetir la carga mueve el servicio finalizado al historial sin duplicarlo', () => {
    const enCurso: ServicioPrueba = { id: 54, fecha: HOY, estado: 'EN_CURSO' };
    const programado: ServicioPrueba = { id: 61, fecha: HOY, estado: 'PROGRAMADO' };
    const anterior: ServicioPrueba = { id: 40, fecha: '2026-10-17', estado: 'FINALIZADO' };
    const primera = componer(vacia, [enCurso, programado], [], [anterior]);

    expect(ids(primera.operativos)).toEqual([54, 61]);
    expect(ids(primera.historial)).toEqual([40]);

    const finalizado: ServicioPrueba = { id: 54, fecha: HOY, estado: 'FINALIZADO' };
    const segunda = componer(primera, [finalizado, programado], [], null);
    const tercera = componer(segunda, [finalizado, programado], [], [anterior, finalizado]);

    expect(ids(segunda.operativos)).toEqual([61]);
    expect(ids(segunda.historial)).toEqual([54, 40]);
    expect(ids(tercera.operativos)).toEqual([61]);
    expect(ids(tercera.historial)).toEqual([54, 40]);
    expect(ids(tercera.historial).filter((id) => id === 54)).toEqual([54]);
  });
});

function componer(
  anterior: VistaServicios<ServicioPrueba>,
  desdeHoy: readonly ServicioPrueba[],
  anteriores: readonly ServicioPrueba[],
  historialConsultado: readonly ServicioPrueba[] | null,
): VistaServicios<ServicioPrueba> {
  const entrada: ActualizacionVistaServicios<ServicioPrueba> = {
    desdeHoy,
    anteriores,
    historialConsultado,
    hoy: HOY,
    id: (servicio) => servicio.id,
    estado: (servicio) => servicio.estado,
    fecha: (servicio) => servicio.fecha,
  };
  return actualizarVistaServicios(anterior, entrada);
}

function ids(servicios: readonly ServicioPrueba[]): number[] {
  return servicios.map((servicio) => servicio.id);
}
