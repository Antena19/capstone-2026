import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'sky';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('slate');
}
