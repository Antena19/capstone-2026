import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconName } from '../../../core/constants/navegacion';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-action-button',
  imports: [Icon],
  templateUrl: './action-button.html',
  styleUrl: './action-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButton {
  readonly label = input.required<string>();
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('primary');
  readonly icon = input<IconName>();
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly clicked = output<void>();
}
