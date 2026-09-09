import type { Metadata } from "next";

import { EstadoVacio } from "@/components/dominio/estado-vacio";
import { CabeceraPagina } from "@/components/shell/cabecera-pagina";
import { miOrganizacion } from "@/lib/consultas";
import { crearClienteServidor } from "@/lib/supabase/server";

import { FormularioNuevaTarea } from "./formulario";

export const metadata: Metadata = { title: "Nueva tarea" };

export default async function PaginaNuevaTarea() {
  const organizacion = await miOrganizacion();
  if (!organizacion) return null;

  const supabase = await crearClienteServidor();

  const [{ data: proyectos }, { data: tipos }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, end_clients(name)")
      .eq("organization_id", organizacion.id)
      .eq("status", "activo")
      .order("name"),
    supabase
      .from("task_types")
      .select("id, name, description, expected_days")
      .eq("organization_id", organizacion.id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <CabeceraPagina
        titulo="Pedir algo nuevo"
        descripcion="Cae en la columna Nuevas del tablero y le llega un aviso al equipo."
      />

      {(proyectos?.length ?? 0) === 0 ? (
        <EstadoVacio
          titulo="Todavía no tienes proyectos"
          descripcion="Crea uno en la sección Proyectos y desde ahí puedes empezar a pedir trabajo."
        />
      ) : (
        <FormularioNuevaTarea
          organizationId={organizacion.id}
          proyectos={(proyectos ?? []).map((p) => ({
            id: p.id,
            nombre: p.end_clients?.name ? `${p.name} — ${p.end_clients.name}` : p.name,
          }))}
          tipos={tipos ?? []}
        />
      )}
    </main>
  );
}
