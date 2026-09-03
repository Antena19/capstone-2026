import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from '../../../core/constants/navegacion';
import { AppCard } from '../app-card/app-card';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-kpi-card',
  imports: [AppCard, Icon],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly sub = input<string>();
  readonly icon = input.required<IconName>();
  readonly tone = input<'blue' | 'green' | 'sky' | 'amber' | 'red' | 'teal'>('blue');
}
