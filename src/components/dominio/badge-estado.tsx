import { cn } from "cn";

import { GlifoEstado } from "@/components/dominio/glifo-estado";
import { ETIQUETA_ESTADO, type Estado } from "@/lib/dominio";

/**
 * Sin color, el estado se lee por glifo y relleno. En el tablero la columna
 * ya es el estado, así que este badge aparece en Hoy, en el detalle y en listas.
 */
const ESTILOS: Record<Estado, string> = {
  nuevo: "border-border-strong text-ink",
  en_revision: "border-transparent bg-surface-sunken text-ink",
  en_progreso: "border-ink text-ink font-[550]",
  esperando_cliente: "border-border-strong border-dashed text-ink-soft",
  hecho: "border-transparent bg-surface-sunken text-ink-soft",
  cancelado: "border-transparent text-ink-faint",
};

export function BadgeEstado({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span
      className={cn(
        "text-chip rounded-chip inline-flex items-center gap-1.5 border px-2 py-0.5",
        ESTILOS[estado],
        className
      )}
    >
      <GlifoEstado estado={estado} />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}
