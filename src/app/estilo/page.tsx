import type { Metadata } from "next";

import { Catalogo } from "./catalogo";

export const metadata: Metadata = { title: "Estilo" };

/**
 * Catálogo de componentes. Ruta oculta: no aparece en navegación y el
 * middleware la deja fuera del alcance de cualquier usuario de cliente.
 * Sirve de espejo para revisar los tokens aplicados.
 */
export default function PaginaEstilo() {
  return <Catalogo />;
}
