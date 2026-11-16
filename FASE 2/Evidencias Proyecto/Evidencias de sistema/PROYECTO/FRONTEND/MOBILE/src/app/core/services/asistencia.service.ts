import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import { AsistenciaRespuesta } from '../models/asistencia';

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private readonly http = inject(HttpClient);

  escanear(token: string): Observable<AsistenciaRespuesta> {
    return this.http.post<AsistenciaRespuesta>(urlApi('/api/asistencia/escanear'), { token });
  }
}
