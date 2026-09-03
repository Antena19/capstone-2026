export type IconName =
  | 'dashboard'
  | 'empresa'
  | 'pasajeros'
  | 'conductores'
  | 'vehiculos'
  | 'ruta'
  | 'servicios'
  | 'reportes'
  | 'bus'
  | 'bell'
  | 'logout'
  | 'chevron'
  | 'search'
  | 'plus'
  | 'download';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

export interface NavGroup {
  titulo: string;
  items: NavItem[];
}

export const MENU_ADMIN: NavGroup[] = [
  {
    titulo: 'Operaciones',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '/empresas', label: 'Empresas Clientes', icon: 'empresa' },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { path: '/pasajeros', label: 'Pasajeros', icon: 'pasajeros' },
      { path: '/conductores', label: 'Conductores', icon: 'conductores' },
      { path: '/vehiculos', label: 'Vehículos', icon: 'vehiculos' },
      { path: '/rutas', label: 'Rutas', icon: 'ruta' },
    ],
  },
  {
    titulo: 'Planificación',
    items: [{ path: '/servicios', label: 'Servicios', icon: 'servicios' }],
  },
  {
    titulo: 'Análisis',
    items: [{ path: '/reportes', label: 'Reportes', icon: 'reportes' }],
  },
];
