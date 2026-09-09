import { cn } from "cn";
import { AlertTriangle } from "lucide-react";

/**
 * En monocromo el rojo no está disponible, así que un error no puede
 * distinguirse por color. Lo hace por glifo, filete y peso.
 */
export function MensajeError({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={cn(
        "text-meta border-ink text-ink flex items-start gap-2 border-l-2 py-0.5 pl-2.5 font-medium",
        className
      )}
    >
      <AlertTriangle className="mt-px size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      <span>{children}</span>
    </p>
  );
}
