import { cn } from "cn";

import type { Estado } from "@/lib/dominio";

/**
 * Los seis estados dibujados a mano en vez de tomarlos de Lucide: en blanco y
 * negro el estado solo puede distinguirse por forma y relleno, y la familia de
 * iconos no trae la progresión exacta (vacío, mitad, lleno, punteado).
 *
 * Nunca va solo: siempre acompañado de su etiqueta.
 */
export function GlifoEstado({ estado, className }: { estado: Estado; className?: string }) {
  const comun = { width: 12, height: 12, viewBox: "0 0 12 12", "aria-hidden": true } as const;
  const clases = cn("shrink-0", className);

  switch (estado) {
    case "nuevo":
      return (
        <svg {...comun} className={clases} fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );

    case "en_revision":
      return (
        <svg {...comun} className={clases} fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          {/* Media luna: el trabajo empezó pero no avanza todavía. */}
          <path d="M6 1.5a4.5 4.5 0 0 1 0 9z" fill="currentColor" />
        </svg>
      );

    case "en_progreso":
      return (
        <svg {...comun} className={clases}>
          <circle cx="6" cy="6" r="4.5" fill="currentColor" />
        </svg>
      );

    case "esperando_cliente":
      return (
        <svg {...comun} className={clases} fill="none">
          <circle
            cx="6"
            cy="6"
            r="4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
        </svg>
      );

    case "hecho":
      return (
        <svg {...comun} className={clases} fill="none">
          <path
            d="M2 6.4 4.8 9.2 10 3.4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "cancelado":
      return (
        <svg {...comun} className={clases} fill="none">
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
