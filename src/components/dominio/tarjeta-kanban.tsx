import { cn } from "cn";
import { AlertTriangle, Calendar, MessageSquare, Paperclip } from "lucide-react";

import { ChipPrioridad } from "@/components/dominio/chip-prioridad";
import { ChipTipo } from "@/components/dominio/chip-tipo";
import { formatearFecha, type Prioridad } from "@/lib/dominio";

export type DatosTarjeta = {
  titulo: string;
  prioridad: Prioridad;
  tipo?: string | null;
  proyecto?: string | null;
  fecha?: string | null;
  vencida?: boolean;
  comentarios?: number;
  adjuntos?: number;
};

/**
 * Anatomía fija: tipo y prioridad arriba, título, proyecto, y abajo fecha a la
 * izquierda con los contadores a la derecha. Cada dato en su lugar de la
 * retícula, sin cadenas de metadatos unidas con puntos medios.
 *
 * El portal del cliente renderiza esta misma tarjeta; lo único que cambia es
 * que no recibe los manejadores de arrastre.
 */
export function TarjetaKanban({
  datos,
  arrastrando = false,
  arrastrable = false,
  className,
}: {
  datos: DatosTarjeta;
  arrastrando?: boolean;
  arrastrable?: boolean;
  className?: string;
}) {
  const { titulo, prioridad, tipo, proyecto, fecha, vencida, comentarios = 0, adjuntos = 0 } = datos;

  return (
    <article
      className={cn(
        "bg-surface border-border rounded-card hover:border-border-strong border p-3",
        "transition-[border-color,box-shadow,transform] duration-(--duracion-rapida) ease-(--curva)",
        // La tarjeta vencida es la única del tablero con filete lateral. El
        // rojo lo refuerza, pero el filete se queda: quien no distinga el tono
        // sigue viendo que esa tarjeta tiene algo distinto.
        vencida && "border-l-tono-urgente border-l-2",
        arrastrable && "cursor-grab active:cursor-grabbing",
        arrastrando && "shadow-arrastre scale-[1.02] cursor-grabbing",
        className
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        {tipo ? <ChipTipo nombre={tipo} /> : <span />}
        <ChipPrioridad prioridad={prioridad} />
      </div>

      <h3 className="text-title-card text-ink line-clamp-2">{titulo}</h3>

      {proyecto ? <p className="text-meta text-ink-soft mt-1 truncate">{proyecto}</p> : null}

      {(fecha || comentarios > 0 || adjuntos > 0) && (
        <div className="text-meta mt-3 flex items-center justify-between gap-2">
          {fecha ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                vencida ? "text-tono-urgente font-semibold" : "text-ink-soft"
              )}
            >
              {vencida ? (
                <AlertTriangle className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              ) : (
                <Calendar className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              )}
              <time dateTime={fecha}>{formatearFecha(fecha)}</time>
            </span>
          ) : (
            <span />
          )}

          {(comentarios > 0 || adjuntos > 0) && (
            <span className="text-ink-soft flex items-center gap-3">
              {comentarios > 0 && (
                <span className="inline-flex items-center gap-1" title={`${comentarios} comentarios`}>
                  <MessageSquare className="size-3.5" strokeWidth={1.5} aria-hidden />
                  <span data-cifras>{comentarios}</span>
                </span>
              )}
              {adjuntos > 0 && (
                <span className="inline-flex items-center gap-1" title={`${adjuntos} archivos`}>
                  <Paperclip className="size-3.5" strokeWidth={1.5} aria-hidden />
                  <span data-cifras>{adjuntos}</span>
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
