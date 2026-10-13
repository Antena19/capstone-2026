import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { rangoPagina, TAMANOS_PAGINA } from '../../../core/utils/paginacion';

@Component({
  selector: 'app-paginacion',
  templateUrl: './paginacion.html',
  styleUrl: './paginacion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paginacion {
  readonly pagina = input.required<number>();
  readonly tamano = input.required<number>();
  readonly total = input.required<number>();

  readonly paginaChange = output<number>();
  readonly tamanoChange = output<number>();

  readonly tamanos = TAMANOS_PAGINA;

  readonly rango = computed(() => rangoPagina(this.total(), this.pagina(), this.tamano()));
  readonly enPrimera = computed(() => this.rango().pagina <= 1);
  readonly enUltima = computed(() => this.rango().pagina >= this.rango().paginas);
  readonly etiquetaTotal = computed(() => (this.total() === 1 ? 'registro' : 'registros'));

  anterior(): void {
    if (this.enPrimera()) {
      return;
    }

    this.paginaChange.emit(this.rango().pagina - 1);
  }

  siguiente(): void {
    if (this.enUltima()) {
      return;
    }

    this.paginaChange.emit(this.rango().pagina + 1);
  }

  cambiarTamano(evento: Event): void {
    this.tamanoChange.emit(Number((evento.target as HTMLSelectElement).value));
  }
}
