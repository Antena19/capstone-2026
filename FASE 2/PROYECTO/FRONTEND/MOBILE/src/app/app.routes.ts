import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { guestGuard, rolGuard, cambiarPasswordGuard } from './core/auth/auth.guard';
import { ROL_CONDUCTOR, ROL_PASAJERO } from './core/constants/auth';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'activar',
    loadComponent: () => import('./features/auth/activar/activar.page').then((m) => m.ActivarPage),
  },
  {
    path: 'cambiar-password',
    canActivate: [cambiarPasswordGuard],
    loadComponent: () =>
      import('./features/auth/cambiar-password/cambiar-password.page').then(
        (m) => m.CambiarPasswordPage,
      ),
  },
  {
    path: 'pasajero',
    pathMatch: 'full',
    canActivate: [rolGuard(ROL_PASAJERO)],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'pasajero/servicios/:idServicio',
    canActivate: [rolGuard(ROL_PASAJERO)],
    loadComponent: () =>
      import('./features/pasajero/detalle/pasajero-detalle.page').then(
        (m) => m.PasajeroDetallePage,
      ),
  },
  {
    path: 'conductor',
    pathMatch: 'full',
    canActivate: [rolGuard(ROL_CONDUCTOR)],
    loadComponent: () =>
      import('./features/conductor/inicio/conductor-inicio.page').then((m) => m.ConductorInicioPage),
  },
  {
    path: 'conductor/servicios/:idServicio/qr',
    canActivate: [rolGuard(ROL_CONDUCTOR)],
    loadComponent: () =>
      import('./features/conductor/qr/conductor-qr.page').then((m) => m.ConductorQrPage),
  },
  {
    path: 'conductor/servicios/:idServicio/pasajeros',
    canActivate: [rolGuard(ROL_CONDUCTOR)],
    loadComponent: () =>
      import('./features/conductor/pasajeros/conductor-pasajeros.page').then(
        (m) => m.ConductorPasajerosPage,
      ),
  },
  {
    path: 'conductor/servicios/:idServicio',
    pathMatch: 'full',
    canActivate: [rolGuard(ROL_CONDUCTOR)],
    loadComponent: () =>
      import('./features/conductor/detalle/conductor-detalle.page').then(
        (m) => m.ConductorDetallePage,
      ),
  },
  {
    path: 'home',
    redirectTo: 'pasajero',
    pathMatch: 'full',
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const auth = inject(AuthService);
      if (auth.autenticado() && auth.esRolMobile(auth.sesion()?.rol)) {
        return auth.rutaInicio();
      }

      return '/login';
    },
  },
];
