import { EstadoRegistro } from './empresa';

export type { EstadoRegistro };

export type EstadoAccesoPasajero = 'SIN_CUENTA' | 'PENDIENTE' | 'ENVIADA' | 'ERROR' | 'ACTIVADA';

export interface Pasajero {
  idPasajero: number;
  idEmpresa: number;
  idUsuario: number | null;
  nombre: string;
  rut: string;
  telefono: string;
  email: string | null;
  direccion: string;
  estado: EstadoRegistro;
  estadoAcceso: EstadoAccesoPasajero;
}

export interface PasajeroSolicitud {
  idEmpresa: number;
  idUsuario: number | null;
  nombre: string;
  rut: string;
  telefono: string;
  email?: string | null;
  direccion: string;
}

export interface PasajeroConCuentaSolicitud {
  idEmpresa: number;
  nombre: string;
  rut: string;
  telefono: string;
  email?: string | null;
  direccion: string;
}

export interface CambiarEstadoPasajeroSolicitud {
  estado: EstadoRegistro;
}

export interface HabilitarAccesoPasajeroSolicitud {
  email?: string | null;
}
