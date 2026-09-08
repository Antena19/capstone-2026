import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import { ServicioPasajeroResumen } from '../models/autenticacion';

@Injectable({ providedIn: 'root' })
export class MisServiciosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<ServicioPasajeroResumen[]> {
    return this.http.get<ServicioPasajeroResumen[]>(urlApi('/api/mis-servicios/pasajero'));
  }
}
