import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  GeocodificarPendientesSolicitud,
  PasajeroMapa,
  ResultadoGeocodificacionLote,
} from '../models/pasajero-mapa';
import { EstadoRegistro } from '../models/empresa';
import {
  AsignarPasajerosSolicitud,
  CrearPuntoSolicitud,
  CrearRutaDisenoSolicitud,
  DefinirExtremoSolicitud,
  ReordenarPuntosSolicitud,
  Ruta,
} from '../models/ruta';

@Injectable({ providedIn: 'root' })
export class RutasService {
  private readonly http = inject(HttpClient);

  listarPasajeros(idEmpresa: number): Observable<PasajeroMapa[]> {
    const params = new HttpParams().set('idEmpresa', String(idEmpresa));
    return this.http.get<PasajeroMapa[]>(urlApi('/api/rutas/pasajeros'), { params });
  }

  geocodificar(idPasajero: number): Observable<PasajeroMapa> {
    return this.http.post<PasajeroMapa>(urlApi(`/api/rutas/pasajeros/${idPasajero}/geocodificar`), {});
  }

  geocodificarPendientes(solicitud: GeocodificarPendientesSolicitud): Observable<ResultadoGeocodificacionLote> {
    return this.http.post<ResultadoGeocodificacionLote>(
      urlApi('/api/rutas/pasajeros/geocodificar-pendientes'),
      solicitud,
    );
  }

  listar(empresaId?: number | null, estado?: EstadoRegistro): Observable<Ruta[]> {
    let params = new HttpParams();
    if (empresaId) {
      params = params.set('empresaId', String(empresaId));
    }

    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<Ruta[]>(urlApi('/api/rutas'), { params });
  }

  obtener(idRuta: string): Observable<Ruta> {
    return this.http.get<Ruta>(urlApi(`/api/rutas/${idRuta}`));
  }

  crearDiseno(solicitud: CrearRutaDisenoSolicitud): Observable<Ruta> {
    return this.http.post<Ruta>(urlApi('/api/rutas/diseno'), solicitud);
  }

  agregarPunto(idRuta: string, solicitud: CrearPuntoSolicitud): Observable<Ruta> {
    return this.http.post<Ruta>(urlApi(`/api/rutas/${idRuta}/puntos-recogida`), solicitud);
  }

  editarPunto(idRuta: string, idPunto: string, solicitud: CrearPuntoSolicitud): Observable<Ruta> {
    return this.http.put<Ruta>(urlApi(`/api/rutas/${idRuta}/puntos-recogida/${idPunto}`), solicitud);
  }

  eliminarPunto(idRuta: string, idPunto: string): Observable<Ruta> {
    return this.http.delete<Ruta>(urlApi(`/api/rutas/${idRuta}/puntos-recogida/${idPunto}`));
  }

  asignarPasajeros(idRuta: string, idPunto: string, solicitud: AsignarPasajerosSolicitud): Observable<Ruta> {
    return this.http.put<Ruta>(urlApi(`/api/rutas/${idRuta}/puntos-recogida/${idPunto}/pasajeros`), solicitud);
  }

  reordenarPuntos(idRuta: string, solicitud: ReordenarPuntosSolicitud): Observable<Ruta> {
    return this.http.put<Ruta>(urlApi(`/api/rutas/${idRuta}/puntos-recogida/orden`), solicitud);
  }

  definirOrigen(idRuta: string, solicitud: DefinirExtremoSolicitud): Observable<Ruta> {
    return this.http.put<Ruta>(urlApi(`/api/rutas/${idRuta}/origen`), solicitud);
  }

  definirDestino(idRuta: string, solicitud: DefinirExtremoSolicitud): Observable<Ruta> {
    return this.http.put<Ruta>(urlApi(`/api/rutas/${idRuta}/destino`), solicitud);
  }

  calcularTrazado(idRuta: string): Observable<Ruta> {
    return this.http.post<Ruta>(urlApi(`/api/rutas/${idRuta}/calcular-trazado`), {});
  }
}
