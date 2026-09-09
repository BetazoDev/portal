import { cn } from "cn";
import { ChevronDown, ChevronUp, ChevronsUp, Minus } from "lucide-react";

import { ETIQUETA_PRIORIDAD, type Prioridad } from "@/lib/dominio";
import { ESTILO_PRIORIDAD } from "@/lib/tonos";

/**
 * Las prioridades escalan en peso y en tono, pero la flecha sigue siendo la
 * que carga el significado: quitando el color, la escala se lee igual.
 */

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
        ESTILO_PRIORIDAD[prioridad],
        className
      )}
    >
      <Icono className="size-3.5" strokeWidth={1.5} aria-hidden />
      {ETIQUETA_PRIORIDAD[prioridad]}
    </span>
  );
}
