import type { Metadata } from "next";

import { CabeceraPagina } from "@/components/shell/cabecera-pagina";
import { PanelCrud } from "@/components/shell/panel-crud";
import { miOrganizacion } from "@/lib/consultas";
import { crearClienteServidor } from "@/lib/supabase/server";

import { borrarClienteFinal, guardarClienteFinal } from "../acciones";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientesDelPortal() {
  const organizacion = await miOrganizacion();
  if (!organizacion) return null;

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("end_clients")
    .select("id, name, company, email, phone, notes, projects(id)")
    .eq("organization_id", organizacion.id)
    .order("name");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <CabeceraPagina
        titulo="Tus clientes"
        descripcion="A quién le trabajas. Cada proyecto cuelga de uno de ellos."
      />

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
            notes: c.notes ?? "",
          },
        }))}
        campos={[
          { name: "name", etiqueta: "Nombre", requerido: true, medio: true },
          { name: "company", etiqueta: "Empresa", medio: true },
          { name: "email", etiqueta: "Correo", tipo: "correo", medio: true },
          { name: "phone", etiqueta: "Teléfono", tipo: "telefono", medio: true },
          { name: "notes", etiqueta: "Notas", tipo: "area" },
        ]}
        ocultos={{ organization_id: organizacion.id }}
        contextoBorrado={organizacion.id}
        textoAlta="Agregar cliente"
        tituloFormulario="Cliente"
        descripcionFormulario="Los datos de contacto de a quién le trabajas."
        vacio={{
          titulo: "Todavía no tienes clientes capturados",
          descripcion: "Agrega el primero para poder abrirle proyectos y pedir trabajo sobre ellos.",
        }}
        accionGuardar={guardarClienteFinal}
        accionBorrar={borrarClienteFinal}
      />
    </main>
  );
}
