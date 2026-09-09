import type { Metadata } from "next";

import { PanelCrud } from "@/components/shell/panel-crud";
import { crearClienteServidor } from "@/lib/supabase/server";

import { borrarClienteFinal, guardarClienteFinal } from "../acciones";

export const metadata: Metadata = { title: "Clientes finales" };

export default async function PaginaClientesFinales({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("end_clients")
    .select("id, name, company, email, phone, website, notes, projects(id)")
    .eq("organization_id", orgId)
    .order("name");

  return (
    <main className="p-6">
      <p className="text-meta text-ink-soft mb-4 max-w-[68ch]">
        Los clientes de esta agencia. Cada proyecto cuelga de uno de ellos.
      </p>

      <PanelCrud
        columnas={[
          { etiqueta: "Nombre" },
          { etiqueta: "Empresa" },
          { etiqueta: "Correo" },
          { etiqueta: "Proyectos", derecha: true },
        ]}
        filas={(data ?? []).map((c) => ({
          id: c.id,
          celdas: [c.name, c.company ?? "", c.email ?? "", String(c.projects?.length ?? 0)],
          datos: {
            name: c.name,
            company: c.company ?? "",
            email: c.email ?? "",
            phone: c.phone ?? "",
            website: c.website ?? "",
            notes: c.notes ?? "",
          },
        }))}
        campos={[
          { name: "name", etiqueta: "Nombre", requerido: true, placeholder: "Lumina Dental", medio: true },
          { name: "company", etiqueta: "Empresa", medio: true },
          { name: "email", etiqueta: "Correo", tipo: "correo", medio: true },
          { name: "phone", etiqueta: "Teléfono", tipo: "telefono", medio: true },
          { name: "website", etiqueta: "Sitio web", tipo: "url", placeholder: "https://" },
          { name: "notes", etiqueta: "Notas", tipo: "area" },
        ]}
        ocultos={{ organization_id: orgId }}
        contextoBorrado={orgId}
        textoAlta="Agregar cliente final"
        tituloFormulario="Cliente final"
        descripcionFormulario="Los datos de contacto de a quién le trabaja esta agencia."
        vacio={{
          titulo: "Esta agencia todavía no tiene clientes finales",
          descripcion:
            "Agrega el primero para poder abrirle proyectos. También los puede capturar la agencia desde su portal.",
        }}
        accionGuardar={guardarClienteFinal}
        accionBorrar={borrarClienteFinal}
      />
    </main>
  );
}
