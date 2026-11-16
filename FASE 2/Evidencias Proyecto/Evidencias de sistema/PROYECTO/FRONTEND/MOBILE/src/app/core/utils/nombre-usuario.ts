export function nombreDeSaludo(nombreCompleto: string | null | undefined): string | null {
  const completo = nombreCompleto?.trim();
  if (!completo) {
    return null;
  }

  return completo.split(/\s+/)[0] ?? null;
}
