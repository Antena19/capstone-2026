import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  CambiarEstadoEmpresaSolicitud,
  Empresa,
  EmpresaSolicitud,
  EstadoRegistro,
} from '../models/empresa';

@Injectable({ providedIn: 'root' })
export class EmpresasService {
  private readonly http = inject(HttpClient);

  listar(estado?: EstadoRegistro | null): Observable<Empresa[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<Empresa[]>(urlApi('/api/empresas'), { params });
  }

  obtenerPorId(idEmpresa: number): Observable<Empresa> {
    return this.http.get<Empresa>(urlApi(`/api/empresas/${idEmpresa}`));
  }

  crear(solicitud: EmpresaSolicitud): Observable<Empresa> {
    return this.http.post<Empresa>(urlApi('/api/empresas'), solicitud);
  }

  editar(idEmpresa: number, solicitud: EmpresaSolicitud): Observable<Empresa> {
    return this.http.put<Empresa>(urlApi(`/api/empresas/${idEmpresa}`), solicitud);
  }

  cambiarEstado(idEmpresa: number, solicitud: CambiarEstadoEmpresaSolicitud): Observable<Empresa> {
    return this.http.put<Empresa>(urlApi(`/api/empresas/${idEmpresa}/estado`), solicitud);
  }
}
