import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import { ServicioPasajeroResumen } from '../models/autenticacion';
import { ServicioConductorDetalle, ServicioConductorResumen, ServicioRespuesta, QrServicioRespuesta, PasajeroServicioConductor } from '../models/conductor';

@Injectable({ providedIn: 'root' })
export class MisServiciosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<ServicioPasajeroResumen[]> {
    return this.http.get<ServicioPasajeroResumen[]>(urlApi('/api/mis-servicios/pasajero'));
  }

  listarConductor(desde: string): Observable<ServicioConductorResumen[]> {
    return this.http.get<ServicioConductorResumen[]>(urlApi('/api/mis-servicios/conductor'), {
      params: { desde },
    });
  }

  obtenerDetalleConductor(idServicio: number): Observable<ServicioConductorDetalle> {
    return this.http.get<ServicioConductorDetalle>(urlApi(`/api/mis-servicios/${idServicio}/detalle`));
  }

  iniciarServicioConductor(idServicio: number): Observable<ServicioRespuesta> {
    return this.http.put<ServicioRespuesta>(urlApi(`/api/mis-servicios/${idServicio}/iniciar`), null);
  }

  obtenerQrConductor(idServicio: number): Observable<QrServicioRespuesta> {
    return this.http.get<QrServicioRespuesta>(urlApi(`/api/mis-servicios/${idServicio}/qr`));
  }

  listarPasajerosConductor(idServicio: number): Observable<PasajeroServicioConductor[]> {
    return this.http.get<PasajeroServicioConductor[]>(urlApi(`/api/mis-servicios/${idServicio}/pasajeros`));
  }
}
