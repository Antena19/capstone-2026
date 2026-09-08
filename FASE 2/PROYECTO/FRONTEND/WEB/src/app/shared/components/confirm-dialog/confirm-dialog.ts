import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ActionButton } from '../action-button/action-button';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal, ActionButton],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly danger = input(false);
  readonly confirmDisabled = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  confirmar(): void {
    if (this.confirmDisabled()) {
      return;
    }

    this.confirmed.emit();
  }
}
