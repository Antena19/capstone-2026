import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { urlApi } from '../config/api';
import {
  CambiarEstadoPasajeroSolicitud,
  EncabezadosImportacion,
  HabilitarAccesoPasajeroSolicitud,
  HojasImportacion,
  MapeoColumnasImportacion,
  Pasajero,
  PasajeroConCuentaSolicitud,
  PasajeroSolicitud,
  PreviewImportacionPasajeros,
  ResultadoImportacionPasajeros,
} from '../models/pasajero';
import { EstadoRegistro } from '../models/empresa';

@Injectable({ providedIn: 'root' })
export class PasajerosService {
  private readonly http = inject(HttpClient);

  listar(estado?: EstadoRegistro | null, idEmpresa?: number | null): Observable<Pasajero[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    if (idEmpresa) {
      params = params.set('idEmpresa', String(idEmpresa));
    }

    return this.http.get<Pasajero[]>(urlApi('/api/pasajeros'), { params });
  }

  obtenerPorId(idPasajero: number): Observable<Pasajero> {
    return this.http.get<Pasajero>(urlApi(`/api/pasajeros/${idPasajero}`));
  }

  crear(solicitud: PasajeroSolicitud): Observable<Pasajero> {
    return this.http.post<Pasajero>(urlApi('/api/pasajeros'), solicitud);
  }

  crearConCuenta(solicitud: PasajeroConCuentaSolicitud): Observable<Pasajero> {
    return this.http.post<Pasajero>(urlApi('/api/pasajeros/con-cuenta'), solicitud);
  }

  editar(idPasajero: number, solicitud: PasajeroSolicitud): Observable<Pasajero> {
    return this.http.put<Pasajero>(urlApi(`/api/pasajeros/${idPasajero}`), solicitud);
  }

  cambiarEstado(idPasajero: number, solicitud: CambiarEstadoPasajeroSolicitud): Observable<Pasajero> {
    return this.http.put<Pasajero>(urlApi(`/api/pasajeros/${idPasajero}/estado`), solicitud);
  }

  reenviarActivacion(idPasajero: number): Observable<Pasajero> {
    return this.http.post<Pasajero>(urlApi(`/api/pasajeros/${idPasajero}/reenviar-activacion`), {});
  }

  habilitarAcceso(
    idPasajero: number,
    solicitud: HabilitarAccesoPasajeroSolicitud = {},
  ): Observable<Pasajero> {
    return this.http.post<Pasajero>(urlApi(`/api/pasajeros/${idPasajero}/habilitar-acceso`), solicitud);
  }

  descargarPlantilla(): Observable<Blob> {
    return this.http.get(urlApi('/api/pasajeros/importacion/plantilla'), { responseType: 'blob' });
  }

  inspeccionarExcel(archivo: File): Observable<HojasImportacion> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<HojasImportacion>(urlApi('/api/pasajeros/importacion/inspeccionar'), datos);
  }

  leerEncabezados(archivo: File, nombreHoja: string): Observable<EncabezadosImportacion> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    datos.append('nombreHoja', nombreHoja);
    return this.http.post<EncabezadosImportacion>(urlApi('/api/pasajeros/importacion/encabezados'), datos);
  }

  validarImportacion(
    idEmpresa: number,
    archivo: File,
    nombreHoja: string,
    mapeo: MapeoColumnasImportacion,
  ): Observable<PreviewImportacionPasajeros> {
    return this.http.post<PreviewImportacionPasajeros>(
      urlApi('/api/pasajeros/importacion/validar'),
      this.formularioImportacion(idEmpresa, archivo, nombreHoja, mapeo),
    );
  }

  importar(
    idEmpresa: number,
    archivo: File,
    nombreHoja: string,
    mapeo: MapeoColumnasImportacion,
  ): Observable<ResultadoImportacionPasajeros> {
    return this.http.post<ResultadoImportacionPasajeros>(
      urlApi('/api/pasajeros/importacion'),
      this.formularioImportacion(idEmpresa, archivo, nombreHoja, mapeo),
    );
  }

  private formularioImportacion(
    idEmpresa: number,
    archivo: File,
    nombreHoja: string,
    mapeo: MapeoColumnasImportacion,
  ): FormData {
    const datos = new FormData();
    datos.append('idEmpresa', String(idEmpresa));
    datos.append('archivo', archivo);
    datos.append('nombreHoja', nombreHoja);
    datos.append('mapeoJson', JSON.stringify(mapeo));
    return datos;
  }
}
