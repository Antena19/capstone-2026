import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: '',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./layout/admin.routes').then((m) => m.adminRoutes),
  },
  { path: '**', redirectTo: '/dashboard' },
];
