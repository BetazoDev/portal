/**
 * Orden fraccionario del tablero.
 *
 * Soltar una tarjeta entre otras dos escribe UNA fila: el promedio de las
 * vecinas. Reescribir la columna completa en cada movimiento sería una
 * tormenta de updates y de eventos de realtime por cada arrastre.
 */

export const PASO_NORMALIZADO = 1000;

/** Por debajo de esta separación, double precision empieza a perder resolución. */
const SEPARACION_MINIMA = 0.0001;

export function calcularOrden(anterior?: number, siguiente?: number) {
  if (anterior === undefined && siguiente === undefined) {
    return { orden: PASO_NORMALIZADO, apretado: false };
  }
  if (anterior === undefined) {
    return { orden: siguiente! - PASO_NORMALIZADO, apretado: false };
  }
  if (siguiente === undefined) {
    return { orden: anterior + PASO_NORMALIZADO, apretado: false };
  }

  return {
    orden: (anterior + siguiente) / 2,
    apretado: Math.abs(siguiente - anterior) < SEPARACION_MINIMA,
  };
}
