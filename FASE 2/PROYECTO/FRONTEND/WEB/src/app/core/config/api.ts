import { environment } from '../../../environments/environment';

export function urlApi(ruta: string): string {
  const base = environment.apiUrl.replace(/\/$/, '');
  const path = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${base}${path}`;
}
