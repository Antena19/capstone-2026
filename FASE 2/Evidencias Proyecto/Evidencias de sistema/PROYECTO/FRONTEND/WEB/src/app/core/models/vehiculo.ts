import { EstadoRegistro } from './empresa';

export type { EstadoRegistro };

export interface Vehiculo {
  idVehiculo: number;
  patente: string;
  tipo: string;
  marca: string;
  modelo: string;
  capacidad: number;
  estado: EstadoRegistro;
}

export interface VehiculoSolicitud {
  patente: string;
  tipo: string;
  marca: string;
  modelo: string;
  capacidad: number;
}

export interface CambiarEstadoVehiculoSolicitud {
  estado: EstadoRegistro;
}
