export type EstadoRegistro = 'ACTIVO' | 'INACTIVO';

export interface Empresa {
  idEmpresa: number;
  rut: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  emailContacto: string;
  nombreContacto: string;
  estado: EstadoRegistro;
}

export interface EmpresaSolicitud {
  rut: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  emailContacto: string;
  nombreContacto: string;
}

export interface CambiarEstadoEmpresaSolicitud {
  estado: EstadoRegistro;
}
