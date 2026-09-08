import { EstadoRegistro } from './empresa';

export type { EstadoRegistro };

export interface Conductor {
  idConductor: number;
  idUsuario: number;
  nombre: string;
  rut: string;
  telefono: string;
  estado: EstadoRegistro;
}

export interface ConductorSolicitud {
  idUsuario: number;
  nombre: string;
  rut: string;
  telefono: string;
}

export interface ConductorConCuentaSolicitud {
  nombre: string;
  rut: string;
  telefono: string;
  email: string;
}

export interface ConductorConCuentaRespuesta {
  idConductor: number;
  idUsuario: number;
  nombre: string;
  rut: string;
  telefono: string;
  email: string;
  estado: EstadoRegistro;
  passwordTemporal: string;
}

export interface CambiarEstadoConductorSolicitud {
  estado: EstadoRegistro;
}
