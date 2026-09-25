import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { urlApi } from '../config/api';
import {
  ConfirmacionViajeSolicitud,
  FiltrosMisServiciosPasajero,
  PasajeroServicioRespuesta,
  ProximoServicioPasajero,
  ServicioPasajeroDetalle,
  ServicioPasajeroResumen,
} from '../models/pasajero';
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

  listarPasajero(filtros: FiltrosMisServiciosPasajero = {}): Observable<ServicioPasajeroResumen[]> {
    let params = new HttpParams();
    if (filtros.fecha) {
      params = params.set('fecha', filtros.fecha);
    }
    if (filtros.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    if (filtros.estadoServicio) {
      params = params.set('estadoServicio', filtros.estadoServicio);
    }
    if (filtros.estadoConfirmacion) {
      params = params.set('estadoConfirmacion', filtros.estadoConfirmacion);
    }

    return this.http.get<ServicioPasajeroResumen[]>(urlApi('/api/mis-servicios/pasajero'), { params });
  }

  obtenerProximoPasajero(): Observable<ProximoServicioPasajero | null> {
    return this.http.get<ProximoServicioPasajero | null>(urlApi('/api/mis-servicios/pasajero/proximo')).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 204) {
          return of(null);
        }

        return throwError(() => error);
      }),
    );
  }

  obtenerDetallePasajero(idServicio: number): Observable<ServicioPasajeroDetalle> {
    return this.http.get<ServicioPasajeroDetalle>(urlApi(`/api/mis-servicios/pasajero/${idServicio}`));
  }

  confirmarViaje(
    idPasajeroServicio: number,
    solicitud: ConfirmacionViajeSolicitud,
  ): Observable<PasajeroServicioRespuesta> {
    return this.http.put<PasajeroServicioRespuesta>(
      urlApi(`/api/mis-servicios/${idPasajeroServicio}/confirmacion`),
      solicitud,
    );
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

  generarQrConductor(idServicio: number): Observable<QrServicioRespuesta> {
    return this.http.post<QrServicioRespuesta>(urlApi(`/api/mis-servicios/${idServicio}/qr`), null);
  }

  listarPasajerosConductor(idServicio: number): Observable<PasajeroServicioConductor[]> {
    return this.http.get<PasajeroServicioConductor[]>(urlApi(`/api/mis-servicios/${idServicio}/pasajeros`));
  }
}
