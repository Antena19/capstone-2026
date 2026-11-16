import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  IonApp,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonRouterOutlet,
  IonTitle,
  IonToolbar,
  MenuController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, logOutOutline, personOutline } from 'ionicons/icons';
import { filter } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { menuDisponible, opcionesMenu, rutaDe } from './core/navegacion/menu-navegacion';

addIcons({ busOutline, personOutline, logOutOutline });

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonApp,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonRouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menu = inject(MenuController);
  private readonly ruta = signal(rutaDe(this.router.url));

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Light });
      void StatusBar.setBackgroundColor({ color: '#2b161b' });
    }

    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((evento) => {
        this.ruta.set(rutaDe(evento.urlAfterRedirects));
        void this.menu.close();
      });
  }

  menuActivo(): boolean {
    const rol = this.auth.sesion()?.rol;
    return menuDisponible({
      autenticado: this.auth.autenticado(),
      rolMobile: this.auth.esRolMobile(rol),
      debeCambiarPassword: this.auth.debeCambiarPassword(),
      url: this.ruta(),
    });
  }

  opciones() {
    if (this.auth.esConductor()) {
      return opcionesMenu('conductor');
    }

    if (this.auth.esPasajero()) {
      return opcionesMenu('pasajero');
    }

    return [];
  }

  async cerrarMenu(): Promise<void> {
    await this.menu.close();
  }

  async cerrarSesion(): Promise<void> {
    await this.menu.close();
    this.auth.cerrarSesion();
    await this.router.navigateByUrl('/login');
  }
}
