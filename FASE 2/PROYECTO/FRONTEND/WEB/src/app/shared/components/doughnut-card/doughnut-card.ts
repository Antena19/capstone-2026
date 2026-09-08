import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { AppCard } from '../app-card/app-card';
import { DoughnutSegment } from './doughnut-segment';

@Component({
  selector: 'app-doughnut-card',
  imports: [AppCard, BaseChartDirective],
  templateUrl: './doughnut-card.html',
  styleUrl: './doughnut-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoughnutCard {
  readonly title = input.required<string>();
  readonly segments = input<DoughnutSegment[]>([]);
  readonly centerValue = input.required<string>();
  readonly centerLabel = input.required<string>();
  readonly emptyMessage = input.required<string>();
  readonly unidad = input('unidades');

  readonly vacio = computed(() => this.segments().every((segmento) => segmento.value === 0));

  readonly datos = computed<ChartData<'doughnut'>>(() => {
    const segmentos = this.segments();
    return {
      labels: segmentos.map((segmento) => segmento.label),
      datasets: [
        {
          data: segmentos.map((segmento) => segmento.value),
          backgroundColor: segmentos.map((segmento) => segmento.color),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
  });

  readonly opciones = computed<ChartConfiguration<'doughnut'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: (items) => items[0]?.label ?? '',
          label: (ctx) => {
            const bruto = ctx.raw;
            const valor = typeof bruto === 'number' ? bruto : 0;
            return `${this.formatoEntero(valor)} ${this.unidad()}`;
          },
        },
      },
    },
  }));

  formatoEntero(valor: number): string {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valor);
  }
}
