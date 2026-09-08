import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-modal',
  imports: [Icon],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly open = input(false);
  readonly titulo = input.required<string>();
  readonly closed = output<void>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((evento) => {
        if (this.open() && evento.key === 'Escape') {
          this.closed.emit();
        }
      });
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
