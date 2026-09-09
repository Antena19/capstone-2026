import { PasajeroMapa } from '../../core/models/pasajero-mapa';

export function normalizarBusqueda(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }

  return valor
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9+]+/g, ' ')
    .trim()
    .toLowerCase();
}

export function coincidePasajero(pasajero: PasajeroMapa, termino: string): boolean {
  const consulta = normalizarBusqueda(termino);
  if (!consulta) {
    return true;
  }

  const campos = [
    pasajero.nombre,
    pasajero.rut,
    pasajero.telefono,
    pasajero.direccion,
    pasajero.direccionGeocodificada ?? '',
  ];

  const hay = normalizarBusqueda(campos.join(' '));
  const compacto = hay.replace(/\s+/g, '');
  const consultaCompacta = consulta.replace(/\s+/g, '');
  return hay.includes(consulta) || compacto.includes(consultaCompacta);
}
