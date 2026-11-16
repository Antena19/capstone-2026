import { App } from '@capacitor/app';

export const INTERVALO_REFRESCO_OPERATIVO_MS = 30_000;

export interface ContextoRefresco {
  generacion: number;
  avisarError: boolean;
  automatico: boolean;
}

export interface RelojIntervalo {
  cada(ms: number, accion: () => void): () => void;
}

export interface EscuchaActividad {
  alCambiar(accion: (activa: boolean) => void): () => void;
}

export interface DecisionErrorRefresco {
  conservarDatos: boolean;
  mostrarError: boolean;
  mostrarAviso: boolean;
}

export function decidirErrorRefresco(tieneDatos: boolean, avisarError: boolean): DecisionErrorRefresco {
  if (!tieneDatos) {
    return { conservarDatos: false, mostrarError: true, mostrarAviso: false };
  }

  return { conservarDatos: true, mostrarError: false, mostrarAviso: avisarError };
}

export class RefrescoOperativo {
  private detenerIntervalo: (() => void) | null = null;
  private dejarActividad: (() => void) | null = null;
  private visible = false;
  private aplicacionActiva = true;
  private solicitudEnCurso = false;
  private repeticionPendiente = false;
  private descartarEnVuelo = false;
  private avisarPendiente = false;
  private pendienteAutomatico = true;
  private sesion = 0;
  private sesionEnVuelo = 0;

  constructor(
    private readonly cargar: (contexto: ContextoRefresco) => void,
    private readonly reloj: RelojIntervalo,
    private readonly actividad: EscuchaActividad,
    private readonly intervaloMs = INTERVALO_REFRESCO_OPERATIVO_MS,
  ) {}

  entrar(): void {
    const primeraVez = !this.visible;
    this.visible = true;
    this.dejarActividad ??= this.actividad.alCambiar((activa) => this.cambiarActividad(activa));
    if (primeraVez) {
      this.iniciarIntervalo();
    }

    this.solicitar();
  }

  salir(): void {
    this.visible = false;
    this.repeticionPendiente = false;
    this.descartarEnVuelo = false;
    this.avisarPendiente = false;
    this.pendienteAutomatico = true;
    this.detenerTemporizador();
    this.dejarActividad?.();
    this.dejarActividad = null;
  }

  solicitar(avisarError = false): boolean {
    if (!this.visible || !this.aplicacionActiva) {
      return false;
    }

    if (this.solicitudEnCurso) {
      this.sesion += 1;
      this.descartarEnVuelo = true;
      this.repeticionPendiente = true;
      this.avisarPendiente = this.avisarPendiente || avisarError;
      this.pendienteAutomatico = false;
      return false;
    }

    this.disparar(avisarError, false);
    return true;
  }

  completar(generacion: number): void {
    if (generacion !== this.sesionEnVuelo) {
      return;
    }

    const repetir = this.descartarEnVuelo || this.repeticionPendiente;
    const avisar = this.avisarPendiente;
    const automatico = this.pendienteAutomatico;
    this.solicitudEnCurso = false;
    this.descartarEnVuelo = false;
    this.repeticionPendiente = false;
    this.avisarPendiente = false;
    this.pendienteAutomatico = true;

    if (repetir && this.visible && this.aplicacionActiva) {
      this.disparar(avisar, automatico);
    }
  }

  esVigente(generacion: number): boolean {
    return generacion === this.sesion && !this.descartarEnVuelo;
  }

  private cambiarActividad(activa: boolean): void {
    if (this.aplicacionActiva === activa) {
      return;
    }

    this.aplicacionActiva = activa;
    if (!this.visible) {
      return;
    }

    if (!activa) {
      this.detenerTemporizador();
      return;
    }

    this.iniciarIntervalo();
    this.solicitar();
  }

  private iniciarIntervalo(): void {
    if (this.detenerIntervalo) {
      return;
    }

    this.detenerIntervalo = this.reloj.cada(this.intervaloMs, () => this.pulso());
  }

  private detenerTemporizador(): void {
    this.detenerIntervalo?.();
    this.detenerIntervalo = null;
  }

  private pulso(): void {
    if (!this.visible || !this.aplicacionActiva) {
      return;
    }

    if (this.solicitudEnCurso) {
      this.repeticionPendiente = true;
      return;
    }

    this.disparar(false, true);
  }

  private disparar(avisarError: boolean, automatico: boolean): void {
    this.sesion += 1;
    this.sesionEnVuelo = this.sesion;
    this.solicitudEnCurso = true;
    this.descartarEnVuelo = false;
    this.repeticionPendiente = false;
    this.avisarPendiente = false;
    this.pendienteAutomatico = true;
    this.cargar({ generacion: this.sesion, avisarError, automatico });
  }
}

export const relojIntervaloNavegador: RelojIntervalo = {
  cada(ms, accion) {
    const id = setInterval(accion, ms);
    return () => clearInterval(id);
  },
};

export function escucharAplicacionCapacitor(): EscuchaActividad {
  return {
    alCambiar(accion) {
      let removido = false;
      const handle = App.addListener('appStateChange', ({ isActive }) => accion(isActive));
      return () => {
        removido = true;
        void handle.then((listener) => {
          if (removido) {
            void listener.remove();
          }
        });
      };
    },
  };
}

export function crearRefrescoOperativo(
  cargar: (contexto: ContextoRefresco) => void,
): RefrescoOperativo {
  return new RefrescoOperativo(cargar, relojIntervaloNavegador, escucharAplicacionCapacitor());
}
