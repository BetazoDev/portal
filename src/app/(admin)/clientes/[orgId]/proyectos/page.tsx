import type { Metadata } from "next";

import { PanelCrud } from "@/components/shell/panel-crud";
import { formatearFecha } from "@/lib/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";

import { borrarProyecto, guardarProyecto } from "../acciones";

export const metadata: Metadata = { title: "Proyectos" };

const ESTADOS = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "pausado", etiqueta: "Pausado" },
  { valor: "terminado", etiqueta: "Terminado" },
  { valor: "archivado", etiqueta: "Archivado" },
];

export default async function PaginaProyectos({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: proyectos }, { data: clientesFinales }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, description, status, due_date, end_client_id, end_clients(name), tasks(id)")
      .eq("organization_id", orgId)
      .order("name"),
    supabase.from("end_clients").select("id, name").eq("organization_id", orgId).order("name"),
  ]);

  const hayClientesFinales = (clientesFinales?.length ?? 0) > 0;

  return (
    <main className="p-6">
      <p className="text-meta text-ink-soft mb-4 max-w-[68ch]">
        Cada proyecto pertenece a un cliente final y agrupa sus tareas en el tablero.
      </p>

      {!hayClientesFinales ? (
        <div className="border-border rounded-card text-meta text-ink-soft border border-dashed p-6">
          Antes de abrir un proyecto hace falta al menos un cliente final. Agrégalo en la pestaña
          Clientes finales.
        </div>
      ) : (
        <PanelCrud
          columnas={[
            { etiqueta: "Proyecto" },
            { etiqueta: "Cliente final" },
            { etiqueta: "Estado" },
            { etiqueta: "Entrega" },
            { etiqueta: "Tareas", derecha: true },
          ]}
          filas={(proyectos ?? []).map((p) => ({
            id: p.id,
            celdas: [
              p.name,
              p.end_clients?.name ?? "",
              ESTADOS.find((e) => e.valor === p.status)?.etiqueta ?? p.status,
              p.due_date ? formatearFecha(p.due_date) : "",
              String(p.tasks?.length ?? 0),
            ],
            datos: {
              name: p.name,
              description: p.description ?? "",
              status: p.status,
              due_date: p.due_date ?? "",
              end_client_id: p.end_client_id,
            },
          }))}
          campos={[
            { name: "name", etiqueta: "Nombre", requerido: true, placeholder: "Sitio Lumina" },
            {
              name: "end_client_id",
              etiqueta: "Cliente final",
              tipo: "select",
              medio: true,
              opciones: (clientesFinales ?? []).map((c) => ({ valor: c.id, etiqueta: c.name })),
            },
            { name: "status", etiqueta: "Estado", tipo: "select", medio: true, opciones: ESTADOS },
            { name: "due_date", etiqueta: "Fecha de entrega", tipo: "fecha", medio: true },
            { name: "description", etiqueta: "Descripción", tipo: "area" },
          ]}
          ocultos={{ organization_id: orgId }}
          contextoBorrado={orgId}
          textoAlta="Crear proyecto"
          tituloFormulario="Proyecto"
          descripcionFormulario="A qué cliente final pertenece y para cuándo se espera."
          vacio={{
            titulo: "Todavía no hay proyectos",
            descripcion:
              "Crea el primero para empezar a recibir tareas en el tablero de esta agencia.",
          }}
          accionGuardar={guardarProyecto}
          accionBorrar={borrarProyecto}
        />
      )}
    </main>
  );
}
