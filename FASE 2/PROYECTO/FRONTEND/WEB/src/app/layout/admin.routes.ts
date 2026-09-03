import { Routes } from '@angular/router';
import { MainLayout } from './main-layout/main-layout';

export const adminRoutes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../features/dashboard/dashboard').then((m) => m.DashboardPage),
        data: { title: 'Dashboard' },
      },
      {
        path: 'empresas',
        loadComponent: () =>
          import('../features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
        data: { title: 'Empresas Clientes' },
      },
      {
        path: 'pasajeros',
        loadComponent: () =>
          import('../features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
        data: { title: 'Pasajeros' },
      },
      {
        path: 'conductores',
        loadComponent: () =>
          import('../features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
        data: { title: 'Conductores' },
      },
      {
        path: 'vehiculos',
        loadComponent: () =>
          import('../features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
        data: { title: 'Vehículos' },
      },
      {
        path: 'rutas',
        loadComponent: () =>
          import('../features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
        data: { title: 'Rutas' },
      },
      {
        path: 'servicios',
        loadComponent: () =>
          import('../features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
        data: { title: 'Servicios' },
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('../features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
        data: { title: 'Reportes' },
      },
    ],
  },
];
