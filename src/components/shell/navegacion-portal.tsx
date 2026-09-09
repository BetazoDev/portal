"use client";

import { cn } from "cn";
import { Building2, FolderOpen, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const APARTADOS = [
  { href: "/portal", etiqueta: "Tablero", Icono: LayoutGrid },
  { href: "/portal/nueva-tarea", etiqueta: "Nueva tarea", Icono: Plus },
  { href: "/portal/clientes-finales", etiqueta: "Clientes", Icono: Building2 },
  { href: "/portal/proyectos", etiqueta: "Proyectos", Icono: FolderOpen },
];

export function NavegacionPortal() {
  const ruta = usePathname();

  return (
    <ul className="space-y-0.5">
      {APARTADOS.map(({ href, etiqueta, Icono }) => {
        const activo = ruta === href;

        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "rounded-control text-body relative flex h-8 items-center gap-2 px-2",
                "duration-(--duracion-rapida) ease-(--curva) transition-colors",
                activo
                  ? "bg-surface text-ink font-medium before:bg-ink before:absolute before:top-1 before:bottom-1 before:-left-1 before:w-0.5 before:rounded-full before:content-['']"
                  : "text-ink-soft hover:bg-surface hover:text-ink"
              )}
            >
              <Icono className="size-[18px] shrink-0" strokeWidth={1.5} />
              {etiqueta}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
