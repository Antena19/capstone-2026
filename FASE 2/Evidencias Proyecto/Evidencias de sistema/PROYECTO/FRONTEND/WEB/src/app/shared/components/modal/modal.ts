import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
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
  readonly wide = input(false);
  readonly ancho = input<'normal' | 'importacion'>('normal');
  readonly closed = output<void>();
  private readonly dialogo = viewChild<ElementRef<HTMLElement>>('dialogo');

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      if (!this.open()) {
        return;
      }

      const dialogo = this.dialogo;
      setTimeout(() => {
        const elemento = dialogo()?.nativeElement;
        if (!elemento || elemento.contains(document.activeElement)) {
          return;
        }

        const campo = elemento.querySelector<HTMLElement>('input:not([readonly]), textarea, select');
        (campo ?? elemento).focus();
      });
    });

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((evento) => this.cerrarSiEscape(evento));
  }

  onBackdrop(event: MouseEvent): void {
    if (
      event.button !== 0
      || event.detail === 0
      || event.shiftKey
      || event.ctrlKey
      || event.altKey
      || event.metaKey
      || event.target !== event.currentTarget
    ) {
      return;
    }

    this.closed.emit();
  }

  private cerrarSiEscape(evento: KeyboardEvent): void {
    if (!this.open() || evento.key !== 'Escape' || evento.shiftKey || evento.ctrlKey || evento.altKey || evento.metaKey) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();
    this.closed.emit();
  }
}
