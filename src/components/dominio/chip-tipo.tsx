import { cn } from "cn";

/**
 * El tipo de tarea, con el color que el dueño le haya puesto.
 *
 * A diferencia de estados y prioridades, aquí el color no lo elige el sistema:
 * viene de `task_types.color`, es editable por organización y puede ser
 * cualquier hex. La clase `.chip-tipo` de globals.css se queda solo con el
 * matiz y le impone luminosidad y techo de croma según el modo, de forma que
 * ninguna elección deje el chip ilegible.
 *
 * Sin color guardado cae en gris y queda como antes.
 */
export function ChipTipo({
  nombre,
  color,
  className,
}: {
  nombre: string;
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "chip-tipo text-chip rounded-chip inline-flex items-center border px-1.5 py-0.5",
        className
      )}
      style={color ? ({ "--tipo-color": color } as React.CSSProperties) : undefined}
    >
      {nombre}
    </span>
  );
}
