import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  CambiarEstadoPlanificacionSolicitud,
  CrearPlanificacionSolicitud,
  EditarPlanificacionSolicitud,
  EstadoPlanificacion,
  Planificacion,
} from '../models/planificacion';

export interface FiltrosPlanificacion {
  idEmpresa?: number;
  periodo?: string;
  estado?: EstadoPlanificacion;
}

@Injectable({ providedIn: 'root' })
export class PlanificacionesService {
  private readonly http = inject(HttpClient);

  listar(filtros?: FiltrosPlanificacion): Observable<Planificacion[]> {
    let params = new HttpParams();
    if (filtros?.idEmpresa) {
      params = params.set('idEmpresa', String(filtros.idEmpresa));
    }

    if (filtros?.periodo) {
      params = params.set('periodo', filtros.periodo);
    }

    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }

    return this.http.get<Planificacion[]>(urlApi('/api/planificaciones'), { params });
  }

  obtenerPorId(idPlanificacion: number): Observable<Planificacion> {
    return this.http.get<Planificacion>(urlApi(`/api/planificaciones/${idPlanificacion}`));
  }

  crear(solicitud: CrearPlanificacionSolicitud): Observable<Planificacion> {
    return this.http.post<Planificacion>(urlApi('/api/planificaciones'), solicitud);
  }

  editar(idPlanificacion: number, solicitud: EditarPlanificacionSolicitud): Observable<Planificacion> {
    return this.http.put<Planificacion>(urlApi(`/api/planificaciones/${idPlanificacion}`), solicitud);
  }

  cambiarEstado(
    idPlanificacion: number,
    solicitud: CambiarEstadoPlanificacionSolicitud,
  ): Observable<Planificacion> {
    return this.http.patch<Planificacion>(urlApi(`/api/planificaciones/${idPlanificacion}/estado`), solicitud);
  }
}
