import { cn } from "cn";

/**
 * Un estado vacío es una invitación a actuar, no un adorno. Siempre dice qué
 * falta y cuál es el siguiente paso; nunca "No hay datos disponibles".
 */
export function EstadoVacio({
  titulo,
  descripcion,
  accion,
  className,
}: {
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border rounded-card flex flex-col items-start gap-3 border border-dashed p-6",
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-title-card text-ink">{titulo}</p>
        <p className="text-meta text-ink-soft max-w-[52ch]">{descripcion}</p>
      </div>
      {accion}
    </div>
  );
}
