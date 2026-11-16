import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import { EstadoRegistro } from '../models/empresa';
import {
  CambiarEstadoConductorSolicitud,
  Conductor,
  ConductorConCuentaRespuesta,
  ConductorConCuentaSolicitud,
  ConductorSolicitud,
} from '../models/conductor';

@Injectable({ providedIn: 'root' })
export class ConductoresService {
  private readonly http = inject(HttpClient);

  listar(estado?: EstadoRegistro | null): Observable<Conductor[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<Conductor[]>(urlApi('/api/conductores'), { params });
  }

  obtenerPorId(idConductor: number): Observable<Conductor> {
    return this.http.get<Conductor>(urlApi(`/api/conductores/${idConductor}`));
  }

  crear(solicitud: ConductorSolicitud): Observable<Conductor> {
    return this.http.post<Conductor>(urlApi('/api/conductores'), solicitud);
  }

  crearConCuenta(solicitud: ConductorConCuentaSolicitud): Observable<ConductorConCuentaRespuesta> {
    return this.http.post<ConductorConCuentaRespuesta>(
      urlApi('/api/conductores/con-cuenta'),
      solicitud,
    );
  }

  editar(idConductor: number, solicitud: ConductorSolicitud): Observable<Conductor> {
    return this.http.put<Conductor>(urlApi(`/api/conductores/${idConductor}`), solicitud);
  }

  cambiarEstado(
    idConductor: number,
    solicitud: CambiarEstadoConductorSolicitud,
  ): Observable<Conductor> {
    return this.http.put<Conductor>(urlApi(`/api/conductores/${idConductor}/estado`), solicitud);
  }
}
