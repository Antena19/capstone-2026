import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import { EstadoRegistro } from '../models/empresa';
import {
  CambiarEstadoUsuarioSolicitud,
  CrearAdministradorSolicitud,
  EditarAdministradorSolicitud,
  Usuario,
} from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listarAdministradores(estado?: EstadoRegistro | null): Observable<Usuario[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<Usuario[]>(urlApi('/api/usuarios'), { params });
  }

  crearAdministrador(solicitud: CrearAdministradorSolicitud): Observable<Usuario> {
    return this.http.post<Usuario>(urlApi('/api/usuarios'), solicitud);
  }

  editarAdministrador(idUsuario: number, solicitud: EditarAdministradorSolicitud): Observable<Usuario> {
    return this.http.put<Usuario>(urlApi(`/api/usuarios/${idUsuario}`), solicitud);
  }

  cambiarEstado(idUsuario: number, solicitud: CambiarEstadoUsuarioSolicitud): Observable<Usuario> {
    return this.http.put<Usuario>(urlApi(`/api/usuarios/${idUsuario}/estado`), solicitud);
  }

  obtenerMiPerfil(): Observable<Usuario> {
    return this.http.get<Usuario>(urlApi('/api/usuarios/me'));
  }

  actualizarMiPerfil(solicitud: EditarAdministradorSolicitud): Observable<Usuario> {
    return this.http.put<Usuario>(urlApi('/api/usuarios/me'), solicitud);
  }
}
