import type { Metadata } from "next";

import { CabeceraPagina } from "@/components/shell/cabecera-pagina";
import { PanelCrud } from "@/components/shell/panel-crud";
import { miOrganizacion } from "@/lib/consultas";
import { formatearFecha } from "@/lib/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";

import { borrarProyecto, guardarProyecto } from "../acciones";

export const metadata: Metadata = { title: "Proyectos" };

export default async function PaginaProyectosDelPortal() {
  const organizacion = await miOrganizacion();
  if (!organizacion) return null;

  const supabase = await crearClienteServidor();

  const [{ data: proyectos }, { data: clientes }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, description, due_date, end_client_id, end_clients(name), tasks(id)")
      .eq("organization_id", organizacion.id)
      .order("name"),
    supabase.from("end_clients").select("id, name").eq("organization_id", organizacion.id).order("name"),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <CabeceraPagina
        titulo="Proyectos"
        descripcion="Agrupan el trabajo que pides. El estado lo maneja el equipo."
      />

      {(clientes?.length ?? 0) === 0 ? (
        <div className="border-border rounded-card text-meta text-ink-soft border border-dashed p-6">
          Antes de abrir un proyecto hace falta al menos un cliente. Agrégalo en la sección
          Clientes.
        </div>
      ) : (
        <PanelCrud
          columnas={[
            { etiqueta: "Proyecto" },
            { etiqueta: "Cliente" },
            { etiqueta: "Entrega" },
            { etiqueta: "Tareas", derecha: true },
          ]}
          filas={(proyectos ?? []).map((p) => ({
            id: p.id,
            celdas: [
              p.name,
              p.end_clients?.name ?? "",
              p.due_date ? formatearFecha(p.due_date) : "",
              String(p.tasks?.length ?? 0),
            ],
            datos: {
              name: p.name,
              description: p.description ?? "",
              due_date: p.due_date ?? "",
              end_client_id: p.end_client_id,
            },
          }))}
          campos={[
            { name: "name", etiqueta: "Nombre", requerido: true },
            {
              name: "end_client_id",
              etiqueta: "Cliente",
              tipo: "select",
              medio: true,
              opciones: (clientes ?? []).map((c) => ({ valor: c.id, etiqueta: c.name })),
            },
            { name: "due_date", etiqueta: "Fecha de entrega", tipo: "fecha", medio: true },
            { name: "description", etiqueta: "Descripción", tipo: "area" },
          ]}
          ocultos={{ organization_id: organizacion.id }}
          contextoBorrado={organizacion.id}
          textoAlta="Crear proyecto"
          tituloFormulario="Proyecto"
          descripcionFormulario="A qué cliente pertenece y para cuándo se espera."
          vacio={{
            titulo: "Todavía no hay proyectos",
            descripcion: "Crea el primero para empezar a pedir trabajo sobre él.",
          }}
          accionGuardar={guardarProyecto}
          accionBorrar={borrarProyecto}
        />
      )}
    </main>
  );
}
