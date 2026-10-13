import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-desviaciones-operacionales',
  imports: [Icon],
  templateUrl: './desviaciones-operacionales.html',
  styleUrl: './desviaciones-operacionales.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesviacionesOperacionales {
  readonly esqueleto = input(false);
  readonly sinAsistencia = input(0);
  readonly noPlanificados = input(0);
  readonly cancelados = input(0);

  formatoEntero(valor: number): string {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valor);
  }
}
