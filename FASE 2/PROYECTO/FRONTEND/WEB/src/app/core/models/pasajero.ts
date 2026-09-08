import { EstadoRegistro } from './empresa';

export type { EstadoRegistro };

export interface Pasajero {
  idPasajero: number;
  idEmpresa: number;
  idUsuario: number | null;
  nombre: string;
  rut: string;
  telefono: string;
  direccion: string;
  estado: EstadoRegistro;
}

export interface PasajeroSolicitud {
  idEmpresa: number;
  idUsuario: number | null;
  nombre: string;
  rut: string;
  telefono: string;
  direccion: string;
}

export interface CambiarEstadoPasajeroSolicitud {
  estado: EstadoRegistro;
}
