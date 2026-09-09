import { cn } from "cn";

/**
 * El tipo de tarea se lee como texto. La base guarda task_types.color en hex,
 * pero el sistema es monocromo estricto por decisión del dueño: ese color no
 * se renderiza y la columna queda disponible por si algún día cambia.
 */
export function ChipTipo({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <span
      className={cn(
        "text-chip rounded-chip border-border text-ink-soft inline-flex items-center border px-1.5 py-0.5",
        className
      )}
    >
      {nombre}
    </span>
  );
}
