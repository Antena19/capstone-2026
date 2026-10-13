import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardEmpresa } from '../../core/models/dashboard';
import { PaginacionLista } from '../../core/utils/paginacion';
import { AppCard } from '../../shared/components/app-card/app-card';
import { Paginacion } from '../../shared/components/paginacion/paginacion';

@Component({
  selector: 'app-resumen-empresas',
  imports: [AppCard, Paginacion],
  templateUrl: './resumen-empresas.html',
  styleUrl: './resumen-empresas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenEmpresas {
  readonly empresas = input.required<DashboardEmpresa[]>();
  readonly idEmpresa = input('');
  readonly paginacion = new PaginacionLista(() => this.empresas());
  readonly filas = computed(() => this.paginacion.recortar());

  seleccionada(idEmpresa: number): boolean {
    return this.idEmpresa() === String(idEmpresa);
  }

  formatoEntero(valor: number): string {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valor);
  }

  formatoPorcentaje(valor: number): string {
    const numero = Number.isFinite(valor) ? valor : 0;
    return `${new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numero)}%`;
  }
}
