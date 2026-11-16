const CUERPO_MINIMO = 1;
const CUERPO_MAXIMO = 8;

function calcularDigitoVerificador(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;

  for (let indice = cuerpo.length - 1; indice >= 0; indice--) {
    suma += Number(cuerpo[indice]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  if (resto === 11) {
    return '0';
  }

  if (resto === 10) {
    return 'K';
  }

  return String(resto);
}

export function normalizarRut(valor: string | null | undefined): string | null {
  if (valor == null) {
    return null;
  }

  const limpio = valor.trim().replace(/\./g, '').replace(/ /g, '');
  const separador = limpio.indexOf('-');
  if (separador <= 0 || separador !== limpio.lastIndexOf('-') || separador === limpio.length - 1) {
    return null;
  }

  const cuerpo = limpio.slice(0, separador);
  const dvIngresado = limpio.slice(separador + 1);
  if (
    cuerpo.length < CUERPO_MINIMO ||
    cuerpo.length > CUERPO_MAXIMO ||
    !/^\d+$/.test(cuerpo) ||
    dvIngresado.length !== 1
  ) {
    return null;
  }

  const dvEsperado = calcularDigitoVerificador(cuerpo);
  if (dvIngresado.toUpperCase() !== dvEsperado) {
    return null;
  }

  return `${cuerpo}-${dvEsperado}`;
}

export function esRutChilenoValido(valor: string | null | undefined): boolean {
  return normalizarRut(valor) !== null;
}
