import type { Metadata } from "next";
import Link from "next/link";

import { EstadoVacio } from "@/components/dominio/estado-vacio";
import { CabeceraPagina } from "@/components/shell/cabecera-pagina";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { crearClienteServidor } from "@/lib/supabase/server";

import { cambiarEstadoOrganizacion, contarContenidoDeOrganizacion } from "./[orgId]/acciones";
import { AccionesDeFila } from "./acciones-fila";
import { FormularioAltaCliente } from "./formulario-alta";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes() {
  const supabase = await crearClienteServidor();

  const { data: organizaciones } = await supabase
    .from("organizations")
    .select("id, name, contact_email, status, projects(id), tasks(id)")
    .order("name");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <CabeceraPagina
        titulo="Clientes"
        descripcion="Las agencias que te subcontratan. Cada una ve solo su propia información."
        acciones={<FormularioAltaCliente />}
      />

      {!organizaciones || organizaciones.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no tienes clientes"
          descripcion="Da de alta la primera agencia. Le creamos su acceso y desde ese momento puede capturar sus clientes finales, sus proyectos y sus tareas."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead className="text-right">Proyectos</TableHead>
              <TableHead className="text-right">Tareas</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizaciones.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/clientes/${o.id}`}
                      className="rounded-control font-medium underline-offset-4 hover:underline"
                    >
                      {o.name}
                    </Link>
                    {o.status !== "activo" ? (
                      <span className="text-chip text-ink-soft rounded-chip border px-1.5 py-0.5">
                        {o.status === "archivado" ? "Archivado" : "Pausado"}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-ink-soft">{o.contact_email ?? "—"}</TableCell>
                <TableCell className="text-right" data-cifras>
                  {o.projects?.length ?? 0}
                </TableCell>
                <TableCell className="text-right" data-cifras>
                  {o.tasks?.length ?? 0}
                </TableCell>
                <TableCell className="text-right">
                  <AccionesDeFila
                    id={o.id}
                    nombre={o.name}
                    status={o.status}
                    alCambiarEstado={cambiarEstadoOrganizacion}
                    alContar={contarContenidoDeOrganizacion}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
