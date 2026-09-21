import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import { ServicioPasajeroResumen } from '../models/autenticacion';
import {
  EstadoServicio,
  PasajeroServicioConductor,
  QrServicioRespuesta,
  ServicioConductorDetalle,
  ServicioConductorResumen,
  ServicioRespuesta,
} from '../models/conductor';

export interface FiltrosMisServiciosConductor {
  fecha?: string;
  estado?: EstadoServicio;
  desde?: string;
  hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class MisServiciosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<ServicioPasajeroResumen[]> {
    return this.http.get<ServicioPasajeroResumen[]>(urlApi('/api/mis-servicios/pasajero'));
  }

  listarConductor(filtros: FiltrosMisServiciosConductor = {}): Observable<ServicioConductorResumen[]> {
    let params = new HttpParams();
    if (filtros.fecha) {
      params = params.set('fecha', filtros.fecha);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros.hasta) {
      params = params.set('hasta', filtros.hasta);
    }

    return this.http.get<ServicioConductorResumen[]>(urlApi('/api/mis-servicios/conductor'), { params });
  }

  obtenerDetalleConductor(idServicio: number): Observable<ServicioConductorDetalle> {
    return this.http.get<ServicioConductorDetalle>(urlApi(`/api/mis-servicios/${idServicio}/detalle`));
  }

  iniciarServicioConductor(idServicio: number): Observable<ServicioRespuesta> {
    return this.http.put<ServicioRespuesta>(urlApi(`/api/mis-servicios/${idServicio}/iniciar`), null);
  }

  finalizarServicioConductor(idServicio: number): Observable<ServicioRespuesta> {
    return this.http.put<ServicioRespuesta>(urlApi(`/api/mis-servicios/${idServicio}/finalizar`), null);
  }

  obtenerQrConductor(idServicio: number): Observable<QrServicioRespuesta> {
    return this.http.get<QrServicioRespuesta>(urlApi(`/api/mis-servicios/${idServicio}/qr`));
  }

  listarPasajerosConductor(idServicio: number): Observable<PasajeroServicioConductor[]> {
    return this.http.get<PasajeroServicioConductor[]>(urlApi(`/api/mis-servicios/${idServicio}/pasajeros`));
  }
}
