export const INTERVALO_REFRESCO_WEB_MS = 30_000;

export interface ContextoRefrescoWeb {
  generacion: number;
  automatico: boolean;
}

export interface RelojIntervaloWeb {
  cada(ms: number, accion: () => void): () => void;
}

export interface EscuchaVisibilidadWeb {
  estaVisible(): boolean;
  alCambiar(accion: (visible: boolean) => void): () => void;
}

export interface PresentacionCargaListado {
  mostrarEsqueleto: boolean;
  limpiarError: boolean;
}

export function presentarCargaListado(_tieneDatos: boolean, automatico: boolean): PresentacionCargaListado {
  if (automatico) {
    return { mostrarEsqueleto: false, limpiarError: false };
  }

  return { mostrarEsqueleto: true, limpiarError: true };
}

export function conservarListadoAnteError(tieneDatos: boolean, automatico: boolean): boolean {
  return automatico && tieneDatos;
}

export interface PlanConsultasDetalle {
  ruta: boolean;
  empresa: boolean;
  catalogoPasajeros: boolean;
}

export function planConsultasDetalle(opciones: {
  idRutaCargada: string | null;
  idRutaServicio: string;
  tieneNombreEmpresa: boolean;
  idsPasajerosConocidos: ReadonlySet<number>;
  idsPasajerosAsociados: readonly number[];
}): PlanConsultasDetalle {
  return {
    ruta: opciones.idRutaCargada !== opciones.idRutaServicio,
    empresa: !opciones.tieneNombreEmpresa,
    catalogoPasajeros: opciones.idsPasajerosAsociados.some((id) => !opciones.idsPasajerosConocidos.has(id)),
  };
}

export function aplicarRefrescoDetalle<T extends { abierto: boolean }>(
  actual: T,
  cambios: Omit<Partial<T>, 'abierto'>,
): T {
  return { ...actual, ...cambios, abierto: actual.abierto };
}

export class RefrescoWeb {
  private activo = false;
  private pausado = false;
  private pestanaVisible = true;
  private solicitudEnCurso = false;
  private repeticionPendiente = false;
  private descartarEnVuelo = false;
  private pendienteAutomatico = true;
  private sesion = 0;
  private sesionEnVuelo = 0;
  private detenerIntervalo: (() => void) | null = null;
  private dejarVisibilidad: (() => void) | null = null;

  constructor(
    private readonly cargar: (contexto: ContextoRefrescoWeb) => void,
    private readonly reloj: RelojIntervaloWeb,
    private readonly visibilidad: EscuchaVisibilidadWeb,
    private readonly intervaloMs = INTERVALO_REFRESCO_WEB_MS,
    private readonly puedeDisparar?: () => boolean,
  ) {}

  iniciar(inmediato = true): void {
    if (this.activo) {
      return;
    }

    this.activo = true;
    this.pestanaVisible = this.visibilidad.estaVisible();
    this.dejarVisibilidad = this.visibilidad.alCambiar((visible) => this.cambiarVisibilidad(visible));
    if (this.puedeTemporizar()) {
      this.iniciarIntervalo();
    }

    if (inmediato && this.pestanaVisible) {
      this.solicitar(false, false);
    }
  }

  detener(): void {
    this.activo = false;
    this.pausado = false;
    this.sesion += 1;
    this.sesionEnVuelo = 0;
    this.solicitudEnCurso = false;
    this.repeticionPendiente = false;
    this.descartarEnVuelo = false;
    this.pendienteAutomatico = true;
    this.detenerTemporizador();
    this.dejarVisibilidad?.();
    this.dejarVisibilidad = null;
  }

  pausar(): void {
    if (!this.activo || this.pausado) {
      return;
    }

    this.pausado = true;
    this.detenerTemporizador();
  }

  reanudar(): void {
    if (!this.activo) {
      return;
    }

    const estabaPausado = this.pausado;
    this.pausado = false;
    if (!this.puedeTemporizar()) {
      return;
    }

    this.iniciarIntervalo();
    if (estabaPausado) {
      this.solicitar(true, false);
    }
  }

  solicitar(automatico = false, ignorarPausa = false): boolean {
    if (!this.activo || !this.pestanaVisible) {
      return false;
    }

    if (this.pausado && !ignorarPausa) {
      return false;
    }

    if (automatico && this.puedeDisparar && !this.puedeDisparar()) {
      return false;
    }

    if (this.solicitudEnCurso) {
      this.sesion += 1;
      this.descartarEnVuelo = true;
      this.repeticionPendiente = true;
      this.pendienteAutomatico = automatico && this.pendienteAutomatico;
      return false;
    }

    this.disparar(automatico);
    return true;
  }

  completar(generacion: number): void {
    if (generacion !== this.sesionEnVuelo) {
      return;
    }

    const repetir = this.descartarEnVuelo || this.repeticionPendiente;
    const automatico = this.pendienteAutomatico;
    this.solicitudEnCurso = false;
    this.descartarEnVuelo = false;
    this.repeticionPendiente = false;
    this.pendienteAutomatico = true;

    if (repetir && this.puedeEjecutar()) {
      this.disparar(automatico);
    }
  }

  esVigente(generacion: number): boolean {
    return generacion === this.sesion && !this.descartarEnVuelo;
  }

  temporizadorActivo(): boolean {
    return this.detenerIntervalo !== null;
  }

  private cambiarVisibilidad(visible: boolean): void {
    if (this.pestanaVisible === visible) {
      return;
    }

    this.pestanaVisible = visible;
    if (!this.activo || this.pausado) {
      return;
    }

    if (!visible) {
      this.detenerTemporizador();
      return;
    }

    this.iniciarIntervalo();
    this.solicitar(true, false);
  }

  private puedeTemporizar(): boolean {
    return this.activo && this.pestanaVisible && !this.pausado;
  }

  private puedeEjecutar(): boolean {
    if (!this.puedeTemporizar()) {
      return false;
    }

    return this.puedeDisparar?.() ?? true;
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
    if (!this.puedeEjecutar()) {
      return;
    }

    if (this.solicitudEnCurso) {
      this.repeticionPendiente = true;
      return;
    }

    this.disparar(true);
  }

  private disparar(automatico: boolean): void {
    this.sesion += 1;
    this.sesionEnVuelo = this.sesion;
    this.solicitudEnCurso = true;
    this.descartarEnVuelo = false;
    this.repeticionPendiente = false;
    this.pendienteAutomatico = true;
    this.cargar({ generacion: this.sesion, automatico });
  }
}

export const relojIntervaloNavegador: RelojIntervaloWeb = {
  cada(ms, accion) {
    const id = window.setInterval(accion, ms);
    return () => window.clearInterval(id);
  },
};

export function escucharVisibilidadDocumento(): EscuchaVisibilidadWeb {
  return {
    estaVisible() {
      return document.visibilityState !== 'hidden';
    },
    alCambiar(accion) {
      const aviso = () => accion(document.visibilityState !== 'hidden');
      document.addEventListener('visibilitychange', aviso);
      return () => document.removeEventListener('visibilitychange', aviso);
    },
  };
}
