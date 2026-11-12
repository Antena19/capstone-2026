import { clasificarErrorAsignacion } from './asignacion-creacion';

describe('clasificarErrorAsignacion', () => {
  const conductor =
    'El conductor Juan Pérez ya está asignado al servicio #45 del 12/11/2026, entre las 08:00 y las 09:00.';
  const vehiculo =
    'El vehículo TEST01 ya está asignado al servicio #48 del 12/11/2026, entre las 08:30 y las 09:30.';

  it('trata el conflicto de conductor como horario', () => {
    expect(clasificarErrorAsignacion(409, conductor)).toBe('horario');
  });

  it('trata el conflicto de vehículo como horario', () => {
    expect(clasificarErrorAsignacion(409, vehiculo)).toBe('horario');
  });

  it('trata los dos conflictos juntos como horario', () => {
    expect(clasificarErrorAsignacion(409, `${conductor} ${vehiculo}`)).toBe('horario');
  });

  it('sigue reconociendo una asignación que ya existía', () => {
    expect(clasificarErrorAsignacion(409, 'El servicio ya tiene una asignación activa.')).toBe(
      'ya-existia',
    );
  });
});
