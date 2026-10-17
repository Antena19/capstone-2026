import { describe, expect, it } from 'vitest';
import {
  asistenciaEfectiva,
  resumirViajes,
  servicioFinalizado,
} from './resumen-viajes';

describe('resumen de viajes', () => {
  it('cuenta solo la asistencia válida del pasajero', () => {
    const resumen = resumirViajes(
      [
        { fecha: '2026-09-16', realizado: asistenciaEfectiva('VALIDA') },
        { fecha: '2026-10-02', realizado: asistenciaEfectiva('PROVISIONAL') },
        { fecha: '2026-10-03', realizado: asistenciaEfectiva('ANULADA') },
        { fecha: '2026-10-09', realizado: asistenciaEfectiva(null) },
        { fecha: '2026-10-10', realizado: asistenciaEfectiva('VALIDA') },
      ],
      new Date('2026-10-17T15:00:00Z'),
    );

    expect(resumen.total).toBe(2);
    expect(resumen.primerViaje).toBe('2026-09-16');
    expect(resumen.ultimoViaje).toBe('2026-10-10');
    expect(resumen.enMesActual).toBe(1);
  });

  it('cuenta solo los servicios finalizados del conductor', () => {
    const resumen = resumirViajes(
      [
        { fecha: '2026-08-01', realizado: servicioFinalizado('FINALIZADO') },
        { fecha: '2026-10-01', realizado: servicioFinalizado('PROGRAMADO') },
        { fecha: '2026-10-02', realizado: servicioFinalizado('EN_CURSO') },
        { fecha: '2026-10-03', realizado: servicioFinalizado('CANCELADO') },
        { fecha: '2026-10-04', realizado: servicioFinalizado('FINALIZADO') },
      ],
      new Date('2026-10-17T15:00:00Z'),
    );

    expect(resumen.total).toBe(2);
    expect(resumen.primerViaje).toBe('2026-08-01');
    expect(resumen.ultimoViaje).toBe('2026-10-04');
    expect(resumen.enMesActual).toBe(1);
  });

  it('no presenta un total cuando no hay viajes realizados', () => {
    expect(resumirViajes([{ fecha: '2026-10-01', realizado: false }]).total).toBe(0);
    expect(resumirViajes([]).primerViaje).toBeNull();
    expect(resumirViajes([{ fecha: '2026-10-01', realizado: true }]).ultimoViaje).toBeNull();
  });
});
