export const PALETA_OPERACIONAL = {
  programado: '#2563eb',
  enCurso: '#0d9488',
  realizado: '#10b981',
  cancelado: '#ef4444',
  planificado: '#2563eb',
  transportado: '#10b981',
  noPlanificado: '#7c3aed',
  neutro: '#cbd5e1',
  pista: '#e2e8f0',
} as const;

export type ColorOperacional = (typeof PALETA_OPERACIONAL)[keyof typeof PALETA_OPERACIONAL];
