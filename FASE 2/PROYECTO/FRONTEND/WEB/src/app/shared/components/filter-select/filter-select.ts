import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'app-filter-select',
  templateUrl: './filter-select.html',
  styleUrl: './filter-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterSelect {
  readonly label = input.required<string>();
  readonly options = input<string[]>([]);
  readonly value = model('');

  onChange(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
