import { BarraSuperior } from "@/components/shell/barra-superior";
import { NavegacionPortal } from "@/components/shell/navegacion-portal";
import { Toaster } from "@/components/ui/sonner";
import { miOrganizacion, perfilActual } from "@/lib/consultas";

export default async function LayoutPortal({ children }: { children: React.ReactNode }) {
  const [perfil, organizacion] = await Promise.all([perfilActual(), miOrganizacion()]);

  return (
    <div className="flex h-svh overflow-hidden">
      <nav
        aria-label="Secciones"
        className="bg-sidebar border-border flex w-56 shrink-0 flex-col border-r p-2"
      >
        <p className="text-label text-ink-soft truncate px-2 py-2">
          {organizacion?.name ?? "Tu portal"}
        </p>
        <NavegacionPortal />
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior nombre={perfil?.full_name ?? perfil?.email ?? ""} />
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
