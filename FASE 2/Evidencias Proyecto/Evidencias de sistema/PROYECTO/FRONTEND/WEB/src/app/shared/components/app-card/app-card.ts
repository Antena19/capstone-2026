import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './app-card.html',
  styleUrl: './app-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCard {}
