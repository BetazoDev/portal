import { Suspense } from "react";

import { BarraLateral } from "@/components/shell/barra-lateral";
import { BarraSuperior } from "@/components/shell/barra-superior";
import { Toaster } from "@/components/ui/sonner";
import { arbolDeClientes, perfilActual } from "@/lib/consultas";

/**
 * Aplica el ancho y el colapso guardados antes de pintar. Sin esto el shell
 * arranca con el ancho por defecto y salta al hidratar.
 */
const guionDeSidebar = `
try {
  var colapsado = localStorage.getItem('sidebar:colapsado') === 'true';
  var ancho = parseInt(localStorage.getItem('sidebar:ancho') || '264', 10);
  document.documentElement.style.setProperty('--ancho-sidebar', (colapsado ? 56 : ancho) + 'px');
  document.documentElement.dataset.sidebar = colapsado ? 'colapsado' : 'abierto';
} catch (e) {}
`;

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const [perfil, clientes] = await Promise.all([perfilActual(), arbolDeClientes()]);

  return (
    <div className="flex h-svh overflow-hidden">
      <script dangerouslySetInnerHTML={{ __html: guionDeSidebar }} />

      <Suspense fallback={<div className="bg-sidebar border-border w-66 shrink-0 border-r" />}>
        <BarraLateral clientes={clientes} />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior nombre={perfil?.full_name ?? perfil?.email ?? ""} />
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
