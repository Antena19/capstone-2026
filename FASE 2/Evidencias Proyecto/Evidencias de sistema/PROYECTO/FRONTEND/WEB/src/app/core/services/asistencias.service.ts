import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import { Asistencia } from '../models/asistencia';

@Injectable({ providedIn: 'root' })
export class AsistenciasService {
  private readonly http = inject(HttpClient);

  listarPorServicio(idServicio: number): Observable<Asistencia[]> {
    const params = new HttpParams().set('idServicio', String(idServicio));
    return this.http.get<Asistencia[]>(urlApi('/api/asistencias'), { params });
  }
}
