import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MENU_ADMIN } from '../../core/constants/navegacion';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly grupos = MENU_ADMIN;
  readonly sesion = this.auth.sesion;

  readonly iniciales = computed(() => {
    const email = this.sesion()?.email ?? '';
    const local = email.split('@')[0] ?? '';
    return local.slice(0, 2).toUpperCase() || 'AD';
  });

  readonly rolVisible = computed(() => {
    const rol = this.sesion()?.rol;
    return rol === 'ADMINISTRADOR' ? 'Administrador' : (rol ?? '');
  });

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
}
