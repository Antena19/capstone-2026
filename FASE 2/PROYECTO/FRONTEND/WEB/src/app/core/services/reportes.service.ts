import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  ConsultaReporte,
  ReporteMensual,
  ReporteOperacional,
  ReportePasajeroServicio,
  ReporteRango,
} from '../models/reporte';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);

  obtener(consulta: ConsultaReporte): Observable<ReporteOperacional> {
    if (consulta.tipo === 'MES') {
      return this.http
        .get<ReporteMensual>(urlApi('/api/reportes/mensual'), {
          params: new HttpParams()
            .set('idEmpresa', String(consulta.idEmpresa))
            .set('periodo', consulta.periodo),
        })
        .pipe(
          map((reporte) => ({
            consulta,
            razonSocial: reporte.razonSocial,
            resumen: reporte.resumen,
            servicios: reporte.servicios,
          })),
        );
    }

    return this.http
      .get<ReporteRango>(urlApi('/api/reportes/resumen'), {
        params: new HttpParams()
          .set('idEmpresa', String(consulta.idEmpresa))
          .set('desde', consulta.desde)
          .set('hasta', consulta.hasta),
      })
      .pipe(
        map((reporte) => ({
          consulta,
          razonSocial: reporte.razonSocial,
          resumen: reporte.resumen,
          servicios: reporte.servicios,
        })),
      );
  }

  listarPasajeros(idServicio: number): Observable<ReportePasajeroServicio[]> {
    return this.http.get<ReportePasajeroServicio[]>(
      urlApi(`/api/reportes/servicios/${idServicio}/pasajeros`),
    );
  }

  descargarExcel(consulta: ConsultaReporte): Observable<HttpResponse<Blob>> {
    if (consulta.tipo === 'MES') {
      return this.http.get(urlApi('/api/reportes/mensual/excel'), {
        params: new HttpParams()
          .set('idEmpresa', String(consulta.idEmpresa))
          .set('periodo', consulta.periodo),
        responseType: 'blob',
        observe: 'response',
      });
    }

    return this.http.get(urlApi('/api/reportes/servicios/excel'), {
      params: new HttpParams()
        .set('idEmpresa', String(consulta.idEmpresa))
        .set('desde', consulta.desde)
        .set('hasta', consulta.hasta),
      responseType: 'blob',
      observe: 'response',
    });
  }
}
