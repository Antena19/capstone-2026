import { Routes } from '@angular/router';
import {
  adminGuard,
  authGuard,
  cambiarPasswordGuard,
  guestGuard,
  passwordObligatorioGuard,
} from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: 'cambiar-password',
    loadComponent: () =>
      import('./features/auth/cambiar-password/cambiar-password').then(
        (m) => m.CambiarPasswordPage,
      ),
    canActivate: [authGuard, adminGuard, cambiarPasswordGuard],
  },
  {
    path: '',
    canActivate: [authGuard, adminGuard, passwordObligatorioGuard],
    loadChildren: () => import('./layout/admin.routes').then((m) => m.adminRoutes),
  },
  { path: '**', redirectTo: '/dashboard' },
];
