import "server-only";

import type { Adjunto, Comentario, Evento, TareaDetallada } from "@/components/tarea/detalle-tarea";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Todo lo que necesita la pantalla de detalle, menos las notas privadas, que
 * se cargan aparte y solo del lado del dueño.
 *
 * Devuelve null cuando RLS no deja ver la tarea, y la pantalla responde 404:
 * decirle a alguien que la tarea existe pero no es suya ya sería filtrar.
 */
export async function cargarTarea(taskId: string) {
  const supabase = await crearClienteServidor();

  const { data: tarea } = await supabase
    .from("v_board_tasks")
    .select(
      "id, title, description, status, priority, due_date, task_type_id, project_id, organization_id, project_name, end_client_name, organization_name"
    )
    .eq("id", taskId)
    .maybeSingle();

  if (!tarea?.organization_id) return null;

  const organizationId = tarea.organization_id;

  const [{ data: eventos }, { data: comentarios }, { data: adjuntos }, { data: proyectos }, { data: tipos }] =
    await Promise.all([
      supabase
        .from("task_events")
        .select("id, event_type, payload, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("comments")
        .select("id, body, created_at, profiles(full_name, email)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false }),
      supabase
        .from("attachments")
        .select("id, file_name, storage_path, size_bytes")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase
        .from("task_types")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  return {
    tarea: tarea as unknown as TareaDetallada,
    eventos: (eventos ?? []) as unknown as Evento[],
    comentarios: (comentarios ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      autor: c.profiles?.full_name ?? c.profiles?.email ?? "Alguien",
    })) as Comentario[],
    adjuntos: (adjuntos ?? []) as Adjunto[],
    proyectos: proyectos ?? [],
    tipos: tipos ?? [],
  };
}
