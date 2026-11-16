import { environment } from '../../../environments/environment';

export function urlApi(ruta: string): string {
  return `${environment.apiUrl}${ruta}`;
}
