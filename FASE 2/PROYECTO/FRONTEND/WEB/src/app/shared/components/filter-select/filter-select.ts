import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, input, model, viewChild } from '@angular/core';

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
  readonly disabled = input(false);
  readonly value = model('');
  private readonly selector = viewChild<ElementRef<HTMLSelectElement>>('selector');

  private readonly sincronizarValor = afterRenderEffect(() => {
    const valor = this.value();
    const elemento = this.selector()?.nativeElement;
    if (!elemento || elemento.value === valor) {
      return;
    }

    elemento.value = valor;
  });

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
