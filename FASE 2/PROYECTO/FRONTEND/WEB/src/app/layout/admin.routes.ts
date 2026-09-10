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
          import('../features/empresas/empresas').then((m) => m.EmpresasPage),
        data: { title: 'Empresas Clientes' },
      },
      {
        path: 'pasajeros',
        loadComponent: () =>
          import('../features/pasajeros/pasajeros').then((m) => m.PasajerosPage),
        data: { title: 'Pasajeros' },
      },
      {
        path: 'conductores',
        loadComponent: () =>
          import('../features/conductores/conductores').then((m) => m.ConductoresPage),
        data: { title: 'Conductores' },
      },
      {
        path: 'vehiculos',
        loadComponent: () =>
          import('../features/vehiculos/vehiculos').then((m) => m.VehiculosPage),
        data: { title: 'Vehículos' },
      },
      {
        path: 'rutas',
        loadComponent: () =>
          import('../features/rutas/rutas').then((m) => m.RutasPage),
        data: { title: 'Rutas' },
      },
      {
        path: 'planificaciones',
        loadComponent: () =>
          import('../features/planificaciones/planificaciones').then((m) => m.PlanificacionesPage),
        data: { title: 'Planificaciones' },
      },
      {
        path: 'servicios',
        loadComponent: () =>
          import('../features/servicios/servicios').then((m) => m.ServiciosPage),
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
