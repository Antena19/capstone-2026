import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  readonly mensaje = signal<string | null>(null);
  private temporizador: number | null = null;

  mostrar(texto: string, duracionMs = 3500): void {
    this.mensaje.set(texto);

    if (this.temporizador != null) {
      window.clearTimeout(this.temporizador);
    }

    this.temporizador = window.setTimeout(() => {
      this.mensaje.set(null);
      this.temporizador = null;
    }, duracionMs);
  }

  cerrar(): void {
    if (this.temporizador != null) {
      window.clearTimeout(this.temporizador);
      this.temporizador = null;
    }

    this.mensaje.set(null);
  }
}
