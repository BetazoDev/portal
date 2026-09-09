import { cn } from "cn";

import { GlifoEstado } from "@/components/dominio/glifo-estado";
import { ETIQUETA_ESTADO, type Estado } from "@/lib/dominio";
import { ESTILO_ESTADO } from "@/lib/tonos";

/**
 * El estado se lee por glifo, borde y relleno; el tono se suma encima para
 * acelerar el reconocimiento. Quitando el color entero el badge se sigue
 * entendiendo, que es la prueba de que el tono no carga significado él solo.
 *
 * En el tablero la columna ya es el estado, así que este badge aparece en Hoy,
 * en el detalle y en las listas.
 */

export function BadgeEstado({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span
      className={cn(
        "text-chip rounded-chip inline-flex items-center gap-1.5 border px-2 py-0.5",
        ESTILO_ESTADO[estado],
        className
      )}
    >
      <GlifoEstado estado={estado} />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}
