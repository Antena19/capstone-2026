import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-pie-operacional',
  templateUrl: './pie-operacional.html',
  styleUrl: './pie-operacional.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.clave]': 'variante() === "servicios"',
    '[class.cifras]': 'variante() === "pasajeros"',
  },
})
export class PieOperacional {
  readonly variante = input.required<'servicios' | 'pasajeros'>();
  readonly finalizados = input(0);
  readonly evaluables = input(0);
  readonly porcentaje = input<number | null>(null);
  readonly planificados = input(0);
  readonly planificadosTransportados = input(0);
  readonly noPlanificadosTransportados = input(0);

  formatoEntero(valor: number): string {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valor);
  }

  formatoPorcentaje(valor: number): string {
    const numero = Number.isFinite(valor) ? valor : 0;
    return `${new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numero)}%`;
  }
}
