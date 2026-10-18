import { describe, expect, it, vi } from 'vitest';
import {
  ContextoRefresco,
  EscuchaActividad,
  INTERVALO_REFRESCO_OPERATIVO_MS,
  RefrescoOperativo,
  decidirErrorRefresco,
} from './refresco-operativo';

function banco() {
  const cargas: ContextoRefresco[] = [];
  const intervalos: Array<{ ms: number; accion: () => void }> = [];
  let alCambiar: ((activa: boolean) => void) | null = null;
  let escuchas = 0;

  const reloj = {
    cada(ms: number, accion: () => void) {
      const registro = { ms, accion };
      intervalos.push(registro);
      return () => {
        const indice = intervalos.indexOf(registro);
        if (indice >= 0) {
          intervalos.splice(indice, 1);
        }
      };
    },
  };

  const actividad: EscuchaActividad = {
    alCambiar(accion) {
      escuchas += 1;
      alCambiar = accion;
      return () => {
        escuchas -= 1;
        if (alCambiar === accion) {
          alCambiar = null;
        }
      };
    },
  };

  const refresco = new RefrescoOperativo((contexto) => cargas.push(contexto), reloj, actividad);

  return {
    refresco,
    cargas,
    intervalos,
    escuchas: () => escuchas,
    pulso() {
      for (const intervalo of [...intervalos]) {
        intervalo.accion();
      }
    },
    fondo(activa: boolean) {
      alCambiar?.(activa);
    },
  };
}

describe('temporizador del refresco operativo', () => {
  it('carga al entrar y repite cada 30 segundos con un solo intervalo', () => {
    const escenario = banco();

    escenario.refresco.entrar();
    escenario.refresco.completar(escenario.cargas[0]!.generacion);

    expect(escenario.cargas).toHaveLength(1);
    expect(escenario.cargas[0]?.automatico).toBe(false);
    expect(escenario.intervalos).toHaveLength(1);
    expect(escenario.intervalos[0]?.ms).toBe(INTERVALO_REFRESCO_OPERATIVO_MS);
    expect(INTERVALO_REFRESCO_OPERATIVO_MS).toBe(30_000);

    escenario.pulso();

    expect(escenario.cargas).toHaveLength(2);
    expect(escenario.cargas[1]?.automatico).toBe(true);
    expect(escenario.cargas[1]?.avisarError).toBe(false);
  });

  it('detiene el temporizador al salir y no vuelve a consultar', () => {
    const escenario = banco();
    escenario.refresco.entrar();
    escenario.refresco.completar(escenario.cargas[0]!.generacion);
    escenario.refresco.salir();

    escenario.pulso();
    escenario.refresco.solicitar();

    expect(escenario.cargas).toHaveLength(1);
    expect(escenario.intervalos).toHaveLength(0);
    expect(escenario.escuchas()).toBe(0);
  });

  it('no crea otro intervalo si la pantalla entra de nuevo mientras sigue visible', () => {
    const escenario = banco();
    escenario.refresco.entrar();
    escenario.refresco.entrar();

    expect(escenario.intervalos).toHaveLength(1);
    expect(escenario.escuchas()).toBe(1);
    expect(escenario.cargas).toHaveLength(1);
  });

  it('pausa en segundo plano y actualiza de inmediato al volver', () => {
    const escenario = banco();
    escenario.refresco.entrar();
    escenario.refresco.completar(escenario.cargas[0]!.generacion);

    escenario.fondo(false);
    escenario.pulso();

    expect(escenario.intervalos).toHaveLength(0);
    expect(escenario.cargas).toHaveLength(1);

    escenario.fondo(true);

    expect(escenario.intervalos).toHaveLength(1);
    expect(escenario.cargas).toHaveLength(2);
    expect(escenario.cargas[1]?.automatico).toBe(false);
  });
});

describe('solicitudes y respuestas del refresco', () => {
  it('actualiza de inmediato después de una acción', () => {
    const escenario = banco();
    escenario.refresco.entrar();
    escenario.refresco.completar(escenario.cargas[0]!.generacion);

    expect(escenario.refresco.solicitar()).toBe(true);

    expect(escenario.cargas).toHaveLength(2);
    expect(escenario.cargas[1]?.automatico).toBe(false);
  });

  it('no lanza otra solicitud mientras hay una en curso y descarta la respuesta antigua', () => {
    const escenario = banco();
    escenario.refresco.entrar();
    const primera = escenario.cargas[0]!.generacion;

    expect(escenario.refresco.solicitar(true)).toBe(false);
    expect(escenario.refresco.esVigente(primera)).toBe(false);
    expect(escenario.cargas).toHaveLength(1);

    escenario.refresco.completar(primera);

    expect(escenario.cargas).toHaveLength(2);
    expect(escenario.refresco.esVigente(escenario.cargas[1]!.generacion)).toBe(true);
    expect(escenario.cargas[1]?.avisarError).toBe(true);
    expect(escenario.refresco.esVigente(primera)).toBe(false);
  });

  it('deja una sola repetición si el pulso llega durante una carga', () => {
    const escenario = banco();
    escenario.refresco.entrar();
    const primera = escenario.cargas[0]!.generacion;

    escenario.pulso();
    escenario.pulso();
    expect(escenario.cargas).toHaveLength(1);
    expect(escenario.refresco.esVigente(primera)).toBe(true);

    escenario.refresco.completar(primera);

    expect(escenario.cargas).toHaveLength(2);
    expect(escenario.cargas[1]?.automatico).toBe(true);
  });

  it('ignora completar una generación que ya no está en vuelo', () => {
    const escenario = banco();
    escenario.refresco.entrar();
    const primera = escenario.cargas[0]!.generacion;
    escenario.refresco.completar(primera);
    escenario.refresco.completar(primera);

    expect(escenario.cargas).toHaveLength(1);
  });
});

describe('errores de red durante el refresco', () => {
  it('muestra el error solo cuando todavía no hay datos', () => {
    expect(decidirErrorRefresco(false, false)).toEqual({
      conservarDatos: false,
      mostrarError: true,
      mostrarAviso: false,
    });
  });

  it('conserva los datos y no avisa en un refresco automático', () => {
    expect(decidirErrorRefresco(true, false)).toEqual({
      conservarDatos: true,
      mostrarError: false,
      mostrarAviso: false,
    });
  });

  it('avisa una vez en el refresco manual sin borrar lo cargado', () => {
    const avisar = vi.fn();
    const decision = decidirErrorRefresco(true, true);

    if (decision.mostrarAviso) {
      avisar();
    }

    expect(decision.conservarDatos).toBe(true);
    expect(decision.mostrarError).toBe(false);
    expect(avisar).toHaveBeenCalledOnce();
  });
});
