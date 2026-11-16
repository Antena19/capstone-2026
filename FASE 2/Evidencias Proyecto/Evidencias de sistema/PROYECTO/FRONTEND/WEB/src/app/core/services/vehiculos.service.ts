import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import { EstadoRegistro } from '../models/empresa';
import {
  CambiarEstadoVehiculoSolicitud,
  Vehiculo,
  VehiculoSolicitud,
} from '../models/vehiculo';

@Injectable({ providedIn: 'root' })
export class VehiculosService {
  private readonly http = inject(HttpClient);

  listar(estado?: EstadoRegistro | null): Observable<Vehiculo[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<Vehiculo[]>(urlApi('/api/vehiculos'), { params });
  }

  obtenerPorId(idVehiculo: number): Observable<Vehiculo> {
    return this.http.get<Vehiculo>(urlApi(`/api/vehiculos/${idVehiculo}`));
  }

  crear(solicitud: VehiculoSolicitud): Observable<Vehiculo> {
    return this.http.post<Vehiculo>(urlApi('/api/vehiculos'), solicitud);
  }

  editar(idVehiculo: number, solicitud: VehiculoSolicitud): Observable<Vehiculo> {
    return this.http.put<Vehiculo>(urlApi(`/api/vehiculos/${idVehiculo}`), solicitud);
  }

  cambiarEstado(
    idVehiculo: number,
    solicitud: CambiarEstadoVehiculoSolicitud,
  ): Observable<Vehiculo> {
    return this.http.put<Vehiculo>(urlApi(`/api/vehiculos/${idVehiculo}/estado`), solicitud);
  }
}
