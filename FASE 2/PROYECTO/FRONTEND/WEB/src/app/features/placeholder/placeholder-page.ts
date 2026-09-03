import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AppCard } from '../../shared/components/app-card/app-card';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-placeholder-page',
  imports: [PageHeader, AppCard],
  templateUrl: './placeholder-page.html',
  styleUrl: './placeholder-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly title = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => String(this.route.snapshot.data['title'] ?? 'Sección')),
    ),
    { initialValue: String(this.route.snapshot.data['title'] ?? 'Sección') },
  );
}
