import {
  formatearFechaHoraInstanteChile,
  formatearFechaInstanteChile,
  formatearHoraInstanteChile,
} from './instantes';

describe('instantes UTC en America/Santiago', () => {
  it('interpreta un instante sin zona como UTC', () => {
    expect(formatearFechaHoraInstanteChile('2026-10-13T23:25:00', '/')).toBe('13/10/2026 20:25');
  });

  it('interpreta el mismo instante con sufijo Z', () => {
    expect(formatearFechaHoraInstanteChile('2026-10-13T23:25:00Z', '/')).toBe('13/10/2026 20:25');
  });

  it('respeta un offset explícito', () => {
    expect(formatearFechaHoraInstanteChile('2026-10-13T20:25:00-03:00', '/')).toBe('13/10/2026 20:25');
  });

  it('cambia el día civil cuando el instante UTC cruza la medianoche de Chile', () => {
    expect(formatearFechaHoraInstanteChile('2026-10-14T02:30:00', '/')).toBe('13/10/2026 23:30');
  });

  it('no convierte una fecha civil programada', () => {
    expect(formatearFechaInstanteChile('2026-10-13', '/')).toBeNull();
    expect(formatearHoraInstanteChile('20:30')).toBeNull();
  });
});
