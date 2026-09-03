import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from '../../../core/constants/navegacion';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(18);
}
