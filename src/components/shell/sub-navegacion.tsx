"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Pestañas de sección. El apartado activo se marca con un filete inferior en
 * tinta: en monocromo el subrayado es lo único que separa lo activo de lo
 * demás sin recurrir a un fondo que competiría con las tarjetas.
 */
export function SubNavegacion({
  base,
  apartados,
}: {
  base: string;
  apartados: { href: string; etiqueta: string }[];
}) {
  const ruta = usePathname();

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Secciones del cliente">
      {apartados.map((a) => {
        const destino = `${base}${a.href}`;
        const activo = ruta === destino;

        return (
          <Link
            key={destino}
            href={destino}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "text-body rounded-t-control -mb-px border-b-2 px-3 py-2 whitespace-nowrap",
              "duration-(--duracion-rapida) ease-(--curva) transition-colors",
              activo
                ? "border-ink text-ink font-medium"
                : "text-ink-soft hover:text-ink border-transparent"
            )}
          >
            {a.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
