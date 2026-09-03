import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppCard } from '../../shared/components/app-card/app-card';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, AppCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
