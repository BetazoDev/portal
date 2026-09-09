import type { Metadata } from "next";
import Link from "next/link";

import { EstadoVacio } from "@/components/dominio/estado-vacio";
import { CabeceraPagina } from "@/components/shell/cabecera-pagina";
import { FiltrosTablero } from "@/components/tablero/filtros-tablero";
import { Tablero } from "@/components/tablero/tablero";
import { CAMPOS_VISTA, type TareaDeTablero } from "@/components/tablero/tipos";
import { Button } from "@/components/ui/button";
import { miOrganizacion } from "@/lib/consultas";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tablero" };

export default async function PaginaPortal() {
  const organizacion = await miOrganizacion();

  if (!organizacion) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <EstadoVacio
          titulo="Tu cuenta todavía no está ligada a una agencia"
          descripcion="Escríbenos para activarla. En cuanto quede, aquí aparece tu tablero."
        />
      </main>
    );
  }

  const supabase = await crearClienteServidor();

  const [{ data: tareas }, { data: proyectos }, { data: tipos }] = await Promise.all([
    supabase
      .from("v_board_tasks")
      .select(CAMPOS_VISTA)
      .eq("organization_id", organizacion.id)
      .order("sort_order"),
    supabase.from("projects").select("id, name").eq("organization_id", organizacion.id).order("name"),
    supabase
      .from("task_types")
      .select("id, name")
      .eq("organization_id", organizacion.id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-6 pt-6">
        <CabeceraPagina
          titulo="Tablero"
          descripcion="Así va tu trabajo. Las tarjetas las mueve el equipo conforme avanza."
          acciones={
            <Button asChild>
              <Link href="/portal/nueva-tarea">Pedir algo nuevo</Link>
            </Button>
          }
        />
        <FiltrosTablero proyectos={proyectos ?? []} tipos={tipos ?? []} />
      </div>

      <div className="mt-4 min-h-0 flex-1">
        {/* El mismo tablero del dueño, sin manejadores de arrastre. */}
        <Tablero
          organizationId={organizacion.id}
          tareasIniciales={(tareas ?? []) as unknown as TareaDeTablero[]}
          soloLectura
          baseDetalle="/portal/tareas"
        />
      </div>
    </div>
  );
}
