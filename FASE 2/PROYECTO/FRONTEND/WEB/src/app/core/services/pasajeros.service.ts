import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  CambiarEstadoPasajeroSolicitud,
  Pasajero,
  PasajeroSolicitud,
} from '../models/pasajero';
import { EstadoRegistro } from '../models/empresa';

@Injectable({ providedIn: 'root' })
export class PasajerosService {
  private readonly http = inject(HttpClient);

  listar(estado?: EstadoRegistro | null, idEmpresa?: number | null): Observable<Pasajero[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    if (idEmpresa) {
      params = params.set('idEmpresa', String(idEmpresa));
    }

    return this.http.get<Pasajero[]>(urlApi('/api/pasajeros'), { params });
  }

  obtenerPorId(idPasajero: number): Observable<Pasajero> {
    return this.http.get<Pasajero>(urlApi(`/api/pasajeros/${idPasajero}`));
  }

  crear(solicitud: PasajeroSolicitud): Observable<Pasajero> {
    return this.http.post<Pasajero>(urlApi('/api/pasajeros'), solicitud);
  }

  editar(idPasajero: number, solicitud: PasajeroSolicitud): Observable<Pasajero> {
    return this.http.put<Pasajero>(urlApi(`/api/pasajeros/${idPasajero}`), solicitud);
  }

  cambiarEstado(idPasajero: number, solicitud: CambiarEstadoPasajeroSolicitud): Observable<Pasajero> {
    return this.http.put<Pasajero>(urlApi(`/api/pasajeros/${idPasajero}/estado`), solicitud);
  }
}
