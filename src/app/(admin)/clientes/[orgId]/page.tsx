import type { Metadata } from "next";

import { FiltrosTablero } from "@/components/tablero/filtros-tablero";
import { Tablero } from "@/components/tablero/tablero";
import type { TareaDeTablero } from "@/components/tablero/tipos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { moverTarea, renormalizarColumna } from "./acciones-tablero";

export const metadata: Metadata = { title: "Tablero" };

export default async function PaginaTablero({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: tareas }, { data: proyectos }, { data: tipos }] = await Promise.all([
    supabase
      .from("v_board_tasks")
      .select(
        "id, organization_id, project_id, project_name, end_client_name, task_type_name, title, status, priority, sort_order, due_date, comment_count, attachment_count, is_overdue"
      )
      .eq("organization_id", orgId)
      .order("sort_order"),
    supabase.from("projects").select("id, name").eq("organization_id", orgId).order("name"),
    supabase
      .from("task_types")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-6 py-4">
        <FiltrosTablero proyectos={proyectos ?? []} tipos={tipos ?? []} />
      </div>

      <div className="min-h-0 flex-1">
        <Tablero
          organizationId={orgId}
          tareasIniciales={(tareas ?? []) as unknown as TareaDeTablero[]}
          onMover={moverTarea}
          onRenormalizar={renormalizarColumna}
        />
      </div>
    </div>
  );
}
