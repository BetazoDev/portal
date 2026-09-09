import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetalleTarea } from "@/components/tarea/detalle-tarea";
import { NotasPrivadas, type Pendiente } from "@/components/tarea/notas-privadas";
import { cargarTarea } from "@/lib/consultas-tarea";
import { crearClienteServidor } from "@/lib/supabase/server";

import {
  actualizarTarea,
  agregarComentario,
  guardarNotasPrivadas,
  registrarAdjunto,
  urlDeDescarga,
} from "./acciones";

export const metadata: Metadata = { title: "Tarea" };

export default async function PaginaTarea({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const datos = await cargarTarea(taskId);
  if (!datos) notFound();

  // Las notas privadas se piden aparte: RLS solo se las devuelve al dueño.
  const supabase = await crearClienteServidor();
  const { data: notas } = await supabase
    .from("task_private_notes")
    .select("body, checklist")
    .eq("task_id", taskId)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <DetalleTarea
        tarea={datos.tarea}
        proyectos={datos.proyectos}
        tipos={datos.tipos}
        eventos={datos.eventos}
        comentarios={datos.comentarios}
        adjuntos={datos.adjuntos}
        onActualizar={actualizarTarea}
        onComentar={agregarComentario}
        onDescargar={urlDeDescarga}
        onAdjuntar={registrarAdjunto}
        panelLateral={
          <NotasPrivadas
            taskId={taskId}
            cuerpoInicial={notas?.body ?? ""}
            checklistInicial={(notas?.checklist as Pendiente[]) ?? []}
            alGuardar={guardarNotasPrivadas}
          />
        }
      />
    </main>
  );
}
