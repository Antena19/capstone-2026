export const ROL_PASAJERO = 'PASAJERO';
export const ROL_CONDUCTOR = 'CONDUCTOR';

export const ROLES_MOBILE = [ROL_PASAJERO, ROL_CONDUCTOR] as const;

export const CLAVE_SESION = 'trayek.sesion.mobile';

/** Clave previa del prototipo solo pasajero. Se migra una vez a CLAVE_SESION. */
export const CLAVE_SESION_LEGADA = 'trayek.sesion.pasajero';

/** Misma política que ValidadorPassword del Backend: 8-100, letra y número. */
export const PATRON_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/;

export const MENSAJE_PASSWORD =
  'La contraseña debe tener entre 8 y 100 caracteres, e incluir al menos una letra y un número.';
