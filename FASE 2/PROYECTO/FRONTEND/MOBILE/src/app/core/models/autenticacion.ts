export interface MensajeRespuesta {
  mensaje: string;
}

export interface LoginSolicitud {
  identificador: string;
  password: string;
}

export interface LoginRespuesta {
  token: string;
  idUsuario: number;
  email: string;
  telefono: string | null;
  rol: string;
  expiracion: string;
  debeCambiarPassword: boolean;
}

export interface SesionUsuario {
  token: string;
  idUsuario: number;
  email: string;
  telefono: string | null;
  rol: string;
  expiracion: string;
  debeCambiarPassword: boolean;
}

export interface CambiarPasswordSolicitud {
  passwordActual: string;
  passwordNueva: string;
}

export interface ActivarCuentaSolicitud {
  telefono: string;
  codigo: string;
  nuevaPassword: string;
}
