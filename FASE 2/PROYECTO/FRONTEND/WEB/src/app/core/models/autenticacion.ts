export interface MensajeRespuesta {
  mensaje: string;
}

export interface LoginSolicitud {
  email: string;
  password: string;
}

export interface LoginRespuesta {
  token: string;
  idUsuario: number;
  email: string;
  rol: string;
  expiracion: string;
}

export interface SesionUsuario {
  token: string;
  idUsuario: number;
  email: string;
  rol: string;
  expiracion: string;
}
