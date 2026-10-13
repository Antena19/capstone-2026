export const PALETA_OPERACIONAL = {
  programado: '#EF4D48',
  enCurso: '#9B555B',
  realizado: '#2B161B',
  cancelado: '#D90700',
  planificado: '#EF4D48',
  transportado: '#453E3E',
  noPlanificado: '#EF4D48',
  neutro: '#d9d0d2',
  pista: '#F6F7F8',
} as const;

export type ColorOperacional = (typeof PALETA_OPERACIONAL)[keyof typeof PALETA_OPERACIONAL];
