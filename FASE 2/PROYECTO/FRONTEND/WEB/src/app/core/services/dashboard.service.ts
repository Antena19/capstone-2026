import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  DashboardConsulta,
  DashboardEmpresa,
  DashboardEvolucion,
  DashboardResumen,
} from '../models/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  obtenerResumen(consulta: DashboardConsulta): Observable<DashboardResumen> {
    return this.http.get<DashboardResumen>(urlApi('/api/dashboard/resumen'), {
      params: this.paramsConsulta(consulta, true, false),
    });
  }

  obtenerEvolucion(consulta: DashboardConsulta): Observable<DashboardEvolucion> {
    return this.http.get<DashboardEvolucion>(urlApi('/api/dashboard/evolucion'), {
      params: this.paramsConsulta(consulta, true, true),
    });
  }

  obtenerEmpresas(consulta: DashboardConsulta): Observable<DashboardEmpresa[]> {
    return this.http.get<DashboardEmpresa[]>(urlApi('/api/dashboard/empresas'), {
      params: this.paramsConsulta(consulta, false, false),
    });
  }

  private paramsConsulta(
    consulta: DashboardConsulta,
    incluirEmpresa: boolean,
    incluirAgrupacion: boolean,
  ): HttpParams {
    let params = new HttpParams().set('desde', consulta.desde).set('hasta', consulta.hasta);

    if (incluirEmpresa && consulta.idEmpresa != null) {
      params = params.set('idEmpresa', String(consulta.idEmpresa));
    }

    if (incluirAgrupacion) {
      params = params.set('agrupacion', consulta.agrupacion);
    }

    return params;
  }
}
