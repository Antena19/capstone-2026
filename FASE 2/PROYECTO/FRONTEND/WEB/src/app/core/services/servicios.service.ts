import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  CambiarEstadoSerieServiciosSolicitud,
  CambiarEstadoServicioSolicitud,
  CrearServicioSolicitud,
  CrearServiciosRecurrentesRespuesta,
  CrearServiciosRecurrentesSolicitud,
  EditarSerieServiciosSolicitud,
  EditarServicioSolicitud,
  FiltrosServicio,
  Servicio,
} from '../models/servicio';

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private readonly http = inject(HttpClient);

  listar(filtros?: FiltrosServicio): Observable<Servicio[]> {
    let params = new HttpParams();
    if (filtros?.idEmpresa) {
      params = params.set('idEmpresa', String(filtros.idEmpresa));
    }

    if (filtros?.idPlanificacion) {
      params = params.set('idPlanificacion', String(filtros.idPlanificacion));
    }

    if (filtros?.fecha) {
      params = params.set('fecha', filtros.fecha);
    }

    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }

    if (filtros?.tipoServicio) {
      params = params.set('tipoServicio', filtros.tipoServicio);
    }

    return this.http.get<Servicio[]>(urlApi('/api/servicios'), { params });
  }

  obtenerPorId(idServicio: number): Observable<Servicio> {
    return this.http.get<Servicio>(urlApi(`/api/servicios/${idServicio}`));
  }

  crear(solicitud: CrearServicioSolicitud): Observable<Servicio> {
    return this.http.post<Servicio>(urlApi('/api/servicios'), solicitud);
  }

  crearRecurrentes(
    solicitud: CrearServiciosRecurrentesSolicitud,
  ): Observable<CrearServiciosRecurrentesRespuesta> {
    return this.http.post<CrearServiciosRecurrentesRespuesta>(urlApi('/api/servicios/recurrentes'), solicitud);
  }

  editar(idServicio: number, solicitud: EditarServicioSolicitud): Observable<Servicio> {
    return this.http.put<Servicio>(urlApi(`/api/servicios/${idServicio}`), solicitud);
  }

  editarSerie(idServicio: number, solicitud: EditarSerieServiciosSolicitud): Observable<Servicio[]> {
    return this.http.put<Servicio[]>(urlApi(`/api/servicios/${idServicio}/serie`), solicitud);
  }

  cambiarEstado(idServicio: number, solicitud: CambiarEstadoServicioSolicitud): Observable<Servicio> {
    return this.http.put<Servicio>(urlApi(`/api/servicios/${idServicio}/estado`), solicitud);
  }

  cambiarEstadoSerie(
    idServicio: number,
    solicitud: CambiarEstadoSerieServiciosSolicitud,
  ): Observable<Servicio[]> {
    return this.http.put<Servicio[]>(urlApi(`/api/servicios/${idServicio}/serie/estado`), solicitud);
  }
}

