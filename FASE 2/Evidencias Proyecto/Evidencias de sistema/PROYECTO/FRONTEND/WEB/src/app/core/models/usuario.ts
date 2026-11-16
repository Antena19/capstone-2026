import { EstadoRegistro } from './empresa';

export type { EstadoRegistro };

export interface Usuario {
  idUsuario: number;
  email: string;
  telefono: string | null;
  idRol: number;
  rol: string;
  estado: EstadoRegistro;
  fechaCreacion: string;
  ultimoAcceso: string | null;
}

export interface CrearAdministradorSolicitud {
  email: string;
  telefono: string | null;
  password: string;
}

export interface EditarAdministradorSolicitud {
  email: string;
  telefono: string | null;
}

export interface CambiarEstadoUsuarioSolicitud {
  estado: EstadoRegistro;
}

export interface RestablecerPasswordRespuesta {
  idUsuario: number;
  email: string;
  passwordTemporal: string;
}
