import { Component, input, output } from '@angular/core';
import { IonButton, IonModal } from '@ionic/angular';
import { nombreDeSaludo } from '../../core/utils/nombre-usuario';

@Component({
  selector: 'app-bienvenida-modal',
  templateUrl: './bienvenida-modal.component.html',
  styleUrls: ['./bienvenida-modal.component.scss'],
  imports: [IonModal, IonButton],
})
export class BienvenidaModalComponent {
  readonly abierta = input(false);
  readonly nombre = input<string | null>(null);
  readonly fecha = input<string | null>(null);
  readonly horario = input<string | null>(null);

  readonly cerrada = output<void>();
  readonly verRecorridos = output<void>();

  saludo(): string {
    const nombre = this.nombreDePila();
    if (nombre) {
      return `¡Bienvenido/a, ${nombre}!`;
    }

    return '¡Bienvenido/a a TRAYEK!';
  }

  private nombreDePila(): string | null {
    return nombreDeSaludo(this.nombre());
  }

  cerrar(): void {
    this.cerrada.emit();
  }

  irARecorridos(): void {
    this.verRecorridos.emit();
  }
}
