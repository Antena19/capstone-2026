import { Component, input } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonHeader,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

@Component({
  selector: 'app-barra-navegacion',
  templateUrl: './barra-navegacion.component.html',
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonMenuButton, IonTitle],
})
export class BarraNavegacionComponent {
  readonly titulo = input.required<string>();
  readonly mostrarMenu = input(false);
  readonly hrefRegreso = input<string | null>(null);

  tieneRegreso(): boolean {
    return Boolean(this.hrefRegreso()?.trim());
  }
}
