export type MetodoRegistro = 'QR' | 'MANUAL' | null | undefined;

export function etiquetaMetodoRegistro(metodo: MetodoRegistro): string {
  if (metodo === 'QR') {
    return 'Código QR';
  }

  if (metodo === 'MANUAL') {
    return 'Manual';
  }

  return '—';
}
