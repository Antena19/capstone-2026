import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIO = 15.5;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

@Component({
  selector: 'app-progress-ring',
  templateUrl: './progress-ring.html',
  styleUrl: './progress-ring.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressRing {
  readonly value = input.required<number>();
  readonly size = input(56);
  readonly color = input('#10b981');
  readonly track = input('#e2e8f0');
  readonly label = input('');

  readonly porcentaje = computed(() => {
    const crudo = this.value();
    if (!Number.isFinite(crudo)) {
      return 0;
    }

    return Math.min(100, Math.max(0, crudo));
  });

  readonly dash = computed(() => {
    const largo = (this.porcentaje() / 100) * CIRCUNFERENCIA;
    return `${largo} ${CIRCUNFERENCIA}`;
  });

  readonly radio = RADIO;
}
