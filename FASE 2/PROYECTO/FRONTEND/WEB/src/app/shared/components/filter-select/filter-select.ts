import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-filter-select',
  templateUrl: './filter-select.html',
  styleUrl: './filter-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterSelect {
  readonly label = input.required<string>();
  readonly options = input<string[]>([]);
  readonly items = input<FilterOption[]>([]);
  readonly includeBlank = input(true);
  readonly blankLabel = input<string>();
  readonly value = model('');

  readonly opciones = computed<FilterOption[]>(() => {
    const items = this.items();
    if (items.length > 0) {
      return items;
    }

    return this.options().map((opcion) => ({ value: opcion, label: opcion }));
  });

  onChange(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
