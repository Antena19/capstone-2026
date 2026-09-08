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
}

export interface ActivarCuentaSolicitud {
  telefono: string;
  codigo: string;
  nuevaPassword: string;
}

export interface ServicioPasajeroResumen {
  idPasajeroServicio: number;
  idServicio: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoServicio: string;
  estadoServicio: string;
  estadoConfirmacion: string;
  nombreRuta?: string | null;
}
