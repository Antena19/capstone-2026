import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-search-input',
  imports: [Icon],
  templateUrl: './search-input.html',
  styleUrl: './search-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInput {
  readonly placeholder = input('Buscar...');
  readonly value = model('');

  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
