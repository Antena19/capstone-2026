import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { AlcanceEdicionSerie, CancelacionServicio, Servicio } from '../../core/models/servicio';
import { ActionButton } from '../../shared/components/action-button/action-button';

const ALCANCES: { value: AlcanceEdicionSerie; label: string; texto: string }[] = [
  {
    value: 'ESTE',
    label: 'Solo este servicio',
    texto: 'Solo se cancelará este servicio.',
  },
  {
    value: 'ESTE_Y_FUTUROS',
    label: 'Este y los futuros',
    texto: 'Se cancelará este servicio y las ocurrencias futuras que continúen programadas.',
  },
  {
    value: 'TODOS_PROGRAMADOS',
    label: 'Todos los programados de la serie',
    texto: 'Se cancelarán todas las ocurrencias que aún estén programadas en la serie.',
  },
];

@Component({
  selector: 'app-servicio-cancelar-dialog',
  imports: [ActionButton],
  templateUrl: './servicio-cancelar-dialog.html',
  styleUrl: './servicio-cancelar-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioCancelarDialog {
  readonly servicio = input<Servicio | null>(null);
  readonly nombreEmpresa = input('');
  readonly nombreRuta = input('');
  readonly cancelando = input(false);
  readonly error = input<string | null>(null);
  readonly confirmado = output<CancelacionServicio>();
  readonly cancelado = output<void>();

  readonly alcance = signal<AlcanceEdicionSerie>('ESTE');

  readonly esRecurrente = computed(() => !!this.servicio()?.idSerie);
  readonly alcancesDisponibles = computed(() => {
    const actual = this.servicio();
    if (!actual || actual.estado === 'PROGRAMADO') {
      return ALCANCES;
    }

    return ALCANCES.filter((item) => item.value !== 'ESTE');
  });

  readonly textoAlcance = computed(() => {
    const alcance = this.alcance();
    const actual = this.servicio();
    const definido = this.alcancesDisponibles().find((item) => item.value === alcance)?.texto ?? '';
    if (alcance === 'ESTE_Y_FUTUROS' && actual?.estado === 'EN_CURSO') {
      return 'Se cancelarán las ocurrencias futuras que continúen programadas. Este servicio en curso no se modificará.';
    }

    return definido;
  });

  readonly etiquetaConfirmar = computed(() => {
    if (this.cancelando()) {
      return 'Cancelando...';
    }

    return this.esRecurrente() ? 'Cancelar servicio(s)' : 'Cancelar servicio';
  });

  constructor() {
    effect(() => {
      const actual = this.servicio();
      untracked(() => {
        this.alcance.set(actual?.estado === 'PROGRAMADO' || !actual?.idSerie ? 'ESTE' : 'ESTE_Y_FUTUROS');
      });
    });
  }

  seleccionarAlcance(valor: AlcanceEdicionSerie): void {
    this.alcance.set(valor);
  }

  confirmar(): void {
    if (this.cancelando()) {
      return;
    }

    const actual = this.servicio();
    if (!actual) {
      return;
    }

    if (actual.idSerie) {
      const alcance = this.alcance();
      if (!this.alcancesDisponibles().some((item) => item.value === alcance)) {
        return;
      }

      this.confirmado.emit({
        tipo: 'serie',
        idServicio: actual.idServicio,
        alcance,
      });
      return;
    }

    this.confirmado.emit({ tipo: 'individual', idServicio: actual.idServicio });
  }

  formatearFecha(fecha: string): string {
    const iso = fecha.slice(0, 10);
    const partes = iso.split('-');
    return partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
  }

  formatearHora(valor: string): string {
    return valor.length >= 5 ? valor.slice(0, 5) : valor;
  }
}
