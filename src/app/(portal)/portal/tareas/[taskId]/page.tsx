import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetalleTarea } from "@/components/tarea/detalle-tarea";
import { cargarTarea } from "@/lib/consultas-tarea";

import {
  agregarComentario,
  cambioNoPermitido,
  registrarAdjunto,
  urlDeDescarga,
} from "../../acciones";

export const metadata: Metadata = { title: "Tarea" };

/**
 * El mismo detalle del dueño, en solo lectura y sin panel de notas privadas.
 * No es que se oculte: el componente NotasPrivadas no se importa en este
 * árbol, así que ni siquiera viaja al navegador del cliente.
 */
export default async function PaginaTareaDelPortal({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const datos = await cargarTarea(taskId);
  if (!datos) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <DetalleTarea
        tarea={datos.tarea}
        proyectos={datos.proyectos}
        tipos={datos.tipos}
        eventos={datos.eventos}
        comentarios={datos.comentarios}
        adjuntos={datos.adjuntos}
        soloLectura
        onActualizar={cambioNoPermitido}
        onComentar={agregarComentario}
        onDescargar={urlDeDescarga}
        onAdjuntar={registrarAdjunto}
      />
    </main>
  );
}
