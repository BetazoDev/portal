import type { Metadata } from "next";

import { PanelCrud } from "@/components/shell/panel-crud";
import { ETIQUETA_PRIORIDAD, PRIORIDADES } from "@/lib/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";

import { borrarTipoDeTarea, guardarTipoDeTarea } from "../acciones";

export const metadata: Metadata = { title: "Tipos de tarea" };

export default async function PaginaTiposDeTarea({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("task_types")
    .select("id, name, description, default_priority, expected_days, is_active")
    .eq("organization_id", orgId)
    .order("sort_order");

  return (
    <main className="p-6">
      <p className="text-meta text-ink-soft mb-4 max-w-[68ch]">
        El catálogo que ve esta agencia al crear una tarea. Cada organización arranca con seis
        tipos base que puedes renombrar, desactivar o ampliar.
      </p>

      <PanelCrud
        columnas={[
          { etiqueta: "Tipo" },
          { etiqueta: "Descripción" },
          { etiqueta: "Prioridad por defecto" },
          { etiqueta: "Días estimados", derecha: true },
          { etiqueta: "Activo" },
        ]}
        filas={(data ?? []).map((t) => ({
          id: t.id,
          celdas: [
            t.name,
            t.description ?? "",
            ETIQUETA_PRIORIDAD[t.default_priority],
            t.expected_days ? String(t.expected_days) : "",
            t.is_active ? "Sí" : "No",
          ],
          datos: {
            name: t.name,
            description: t.description ?? "",
            default_priority: t.default_priority,
            expected_days: t.expected_days ? String(t.expected_days) : "",
            is_active: String(t.is_active),
          },
        }))}
        campos={[
          { name: "name", etiqueta: "Nombre", requerido: true, medio: true },
          {
            name: "default_priority",
            etiqueta: "Prioridad por defecto",
            tipo: "select",
            medio: true,
            opciones: PRIORIDADES.map((p) => ({ valor: p.prioridad, etiqueta: p.etiqueta })),
          },
          {
            name: "expected_days",
            etiqueta: "Días estimados",
            tipo: "numero",
            medio: true,
            ayuda: "Sirve para sugerir la fecha de entrega.",
          },
          { name: "description", etiqueta: "Descripción", tipo: "area" },
          { name: "is_active", etiqueta: "Disponible al crear tareas", tipo: "switch" },
        ]}
        ocultos={{ organization_id: orgId }}
        contextoBorrado={orgId}
        textoAlta="Agregar tipo"
        tituloFormulario="Tipo de tarea"
        descripcionFormulario="Cómo se clasifica el trabajo que pide esta agencia."
        vacio={{
          titulo: "Esta agencia se quedó sin tipos de tarea",
          descripcion:
            "Agrega al menos uno para que puedan clasificar lo que te mandan. Si borraste los base, puedes volver a crearlos con los mismos nombres.",
        }}
        accionGuardar={guardarTipoDeTarea}
        accionBorrar={borrarTipoDeTarea}
      />
    </main>
  );
}
