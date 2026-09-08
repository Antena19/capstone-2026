import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PALETA_OPERACIONAL } from '../../../core/constants/paleta-operacional';
import { IconName } from '../../../core/constants/navegacion';
import { AppCard } from '../app-card/app-card';
import { Icon } from '../icon/icon';
import { ProgressRing } from '../progress-ring/progress-ring';

@Component({
  selector: 'app-kpi-card',
  imports: [AppCard, Icon, ProgressRing],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly sub = input<string>();
  readonly icon = input<IconName>();
  readonly tone = input<'blue' | 'green' | 'sky' | 'amber' | 'red' | 'teal'>('blue');
  readonly progress = input<number | null>(null);
  readonly progressColor = input<string>(PALETA_OPERACIONAL.realizado);

  readonly mostrarAnillo = computed(() => this.progress() !== null);
}
