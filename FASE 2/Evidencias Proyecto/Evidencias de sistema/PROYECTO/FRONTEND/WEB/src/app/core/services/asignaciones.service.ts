import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  AsignacionServicio,
  CrearAsignacionSolicitud,
  FiltrosAsignacion,
  ReemplazarAsignacionSolicitud,
} from '../models/asignacion';

@Injectable({ providedIn: 'root' })
export class AsignacionesService {
  private readonly http = inject(HttpClient);

  listar(filtros?: FiltrosAsignacion): Observable<AsignacionServicio[]> {
    let params = new HttpParams();
    if (filtros?.idServicio) {
      params = params.set('idServicio', String(filtros.idServicio));
    }

    if (filtros?.idConductor) {
      params = params.set('idConductor', String(filtros.idConductor));
    }

    if (filtros?.idVehiculo) {
      params = params.set('idVehiculo', String(filtros.idVehiculo));
    }

    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }

    return this.http.get<AsignacionServicio[]>(urlApi('/api/asignaciones'), { params });
  }

  obtenerPorId(idAsignacion: number): Observable<AsignacionServicio> {
    return this.http.get<AsignacionServicio>(urlApi(`/api/asignaciones/${idAsignacion}`));
  }

  crear(solicitud: CrearAsignacionSolicitud): Observable<AsignacionServicio> {
    return this.http.post<AsignacionServicio>(urlApi('/api/asignaciones'), solicitud);
  }

  reemplazar(idAsignacion: number, solicitud: ReemplazarAsignacionSolicitud): Observable<AsignacionServicio> {
    return this.http.put<AsignacionServicio>(urlApi(`/api/asignaciones/${idAsignacion}/reemplazar`), solicitud);
  }
}
