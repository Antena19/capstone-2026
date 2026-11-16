import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Icon } from '../../shared/components/icon/icon';

const TITULO_FALLBACK = 'Dashboard';

@Component({
  selector: 'app-topbar',
  imports: [DatePipe, Icon],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly ahora = signal(new Date());
  readonly titulo = signal(TITULO_FALLBACK);

  constructor() {
    const id = window.setInterval(() => this.ahora.set(new Date()), 30_000);
    this.destroyRef.onDestroy(() => window.clearInterval(id));

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.titulo.set(this.tituloDesdeRuta()));
  }

  private tituloDesdeRuta(): string {
    let actual: ActivatedRoute | null = this.route.root ?? this.router.routerState?.root ?? null;
    let titulo = TITULO_FALLBACK;

    while (actual) {
      const candidato = actual.snapshot?.data?.['title'];
      if (typeof candidato === 'string' && candidato.trim().length > 0) {
        titulo = candidato;
      }

      actual = actual.firstChild ?? null;
    }

    return titulo;
  }
}
