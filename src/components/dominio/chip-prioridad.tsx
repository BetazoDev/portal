import { cn } from "cn";
import { ChevronDown, ChevronUp, ChevronsUp, Minus } from "lucide-react";

import { ETIQUETA_PRIORIDAD, type Prioridad } from "@/lib/dominio";

/**
 * Las cuatro prioridades escalan en peso visual, no en tono. La inversión se
 * reserva para "urgente": es el recurso más fuerte que hay en blanco y negro
 * y pierde efecto si se usa dos veces.
 */
const ESTILOS: Record<Prioridad, string> = {
  baja: "border-transparent text-ink-soft",
  media: "border-border text-ink-soft",
  alta: "border-border-strong bg-surface-sunken text-ink font-[550]",
  urgente: "border-ink bg-ink text-paper",
};

const ICONOS: Record<Prioridad, typeof Minus> = {
  baja: ChevronDown,
  media: Minus,
  alta: ChevronUp,
  urgente: ChevronsUp,
};

export function ChipPrioridad({
  prioridad,
  className,
}: {
  prioridad: Prioridad;
  className?: string;
}) {
  const Icono = ICONOS[prioridad];

  return (
    <span
      className={cn(
        "text-chip rounded-chip inline-flex items-center gap-1 border px-1.5 py-0.5",
        ESTILOS[prioridad],
        className
      )}
    >
      <Icono className="size-3.5" strokeWidth={1.5} aria-hidden />
      {ETIQUETA_PRIORIDAD[prioridad]}
    </span>
  );
}
