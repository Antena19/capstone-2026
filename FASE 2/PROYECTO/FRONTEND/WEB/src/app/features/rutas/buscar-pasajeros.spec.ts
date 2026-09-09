import { coincidePasajero, normalizarBusqueda } from './buscar-pasajeros';
import { PasajeroMapa } from '../../core/models/pasajero-mapa';

function pasajero(parcial: Partial<PasajeroMapa>): PasajeroMapa {
  return {
    idPasajero: 1,
    nombre: 'Diego Muñoz Vera',
    rut: '12.345.678-9',
    telefono: '+56912345678',
    direccion: 'Avenida Austral 850',
    latitud: -41.46,
    longitud: -73.0,
    direccionGeocodificada: 'Av. Austral 850, Puerto Montt',
    fechaGeocodificacion: null,
    estadoGeocodificacion: 'GEOCODIFICADO',
    ...parcial,
  };
}

describe('buscar pasajeros', () => {
  const diego = pasajero({});

  it('normaliza acentos, mayúsculas y espacios', () => {
    expect(normalizarBusqueda('  Díego   ')).toBe('diego');
  });

  it('encuentra por nombre parcial e ignora acentos', () => {
    expect(coincidePasajero(diego, 'diego')).toBeTrue();
    expect(coincidePasajero(diego, 'MUÑOZ')).toBeTrue();
  });

  it('encuentra RUT con y sin formato', () => {
    expect(coincidePasajero(diego, '12.345.678-9')).toBeTrue();
    expect(coincidePasajero(diego, '123456789')).toBeTrue();
  });

  it('encuentra teléfono y parte de dirección', () => {
    expect(coincidePasajero(diego, '912345678')).toBeTrue();
    expect(coincidePasajero(diego, 'austral')).toBeTrue();
    expect(coincidePasajero(diego, 'puerto montt')).toBeTrue();
  });

  it('no encuentra si no hay coincidencia y acepta búsqueda vacía', () => {
    expect(coincidePasajero(diego, 'fernanda')).toBeFalse();
    expect(coincidePasajero(diego, '   ')).toBeTrue();
  });
});
