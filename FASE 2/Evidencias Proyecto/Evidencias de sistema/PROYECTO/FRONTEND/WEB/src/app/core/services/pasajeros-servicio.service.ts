import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  AsignarPuntoRecogidaSolicitud,
  CambiarEstadoPasajeroServicioSolicitud,
  CrearPasajerosServicioLoteSolicitud,
  FiltrosPasajeroServicio,
  PasajeroServicio,
} from '../models/servicio';

@Injectable({ providedIn: 'root' })
export class PasajerosServicioService {
  private readonly http = inject(HttpClient);

  listar(filtros?: FiltrosPasajeroServicio): Observable<PasajeroServicio[]> {
    let params = new HttpParams();
    if (filtros?.idServicio) {
      params = params.set('idServicio', String(filtros.idServicio));
    }

    if (filtros?.idPasajero) {
      params = params.set('idPasajero', String(filtros.idPasajero));
    }

    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }

    if (filtros?.estadoConfirmacion) {
      params = params.set('estadoConfirmacion', filtros.estadoConfirmacion);
    }

    return this.http.get<PasajeroServicio[]>(urlApi('/api/pasajeros-servicio'), { params });
  }

  crearLote(solicitud: CrearPasajerosServicioLoteSolicitud): Observable<PasajeroServicio[]> {
    return this.http.post<PasajeroServicio[]>(urlApi('/api/pasajeros-servicio/lote'), solicitud);
  }

  cambiarEstado(
    idPasajeroServicio: number,
    solicitud: CambiarEstadoPasajeroServicioSolicitud,
  ): Observable<PasajeroServicio> {
    return this.http.put<PasajeroServicio>(
      urlApi(`/api/pasajeros-servicio/${idPasajeroServicio}/estado`),
      solicitud,
    );
  }

  asignarPuntoRecogida(
    idPasajeroServicio: number,
    solicitud: AsignarPuntoRecogidaSolicitud,
  ): Observable<PasajeroServicio> {
    return this.http.put<PasajeroServicio>(
      urlApi(`/api/pasajeros-servicio/${idPasajeroServicio}/punto-recogida`),
      solicitud,
    );
  }
}
