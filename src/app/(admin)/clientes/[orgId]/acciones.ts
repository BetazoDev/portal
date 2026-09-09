"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { crearClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; error?: string };

/**
 * Todo pasa por la sesión del usuario, nunca por service_role: si RLS deja
 * escribir, es porque le corresponde. El único lugar donde se usa la llave de
 * servicio es el alta de cliente, que necesita crear usuarios de auth.
 */
async function ejecutar(
  accion: (
    supabase: Awaited<ReturnType<typeof crearClienteServidor>>
  ) => PromiseLike<{ error: { message: string } | null }>,
  rutas: string[]
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await accion(supabase);

  if (error) return { ok: false, error: error.message };
  for (const r of rutas) revalidatePath(r, "layout");
  return { ok: true };
}

// ------------------------------------------------------------- clientes finales

const esquemaClienteFinal = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  name: z.string().trim().min(2, "El nombre es muy corto"),
  company: z.string().trim().optional(),
  email: z.string().trim().email("Ese correo no tiene un formato válido").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function guardarClienteFinal(datos: FormData): Promise<Resultado> {
  const analizado = esquemaClienteFinal.safeParse(Object.fromEntries(datos));
  if (!analizado.success) return { ok: false, error: analizado.error.issues[0].message };

  const { id, ...campos } = analizado.data;
  const fila = {
    ...campos,
    company: campos.company || null,
    email: campos.email || null,
    phone: campos.phone || null,
    website: campos.website || null,
    notes: campos.notes || null,
  };

  return ejecutar(
    (s) => (id ? s.from("end_clients").update(fila).eq("id", id) : s.from("end_clients").insert(fila)),
    [`/clientes/${campos.organization_id}`]
  );
}

export async function borrarClienteFinal(id: string, organizationId: string): Promise<Resultado> {
  return ejecutar((s) => s.from("end_clients").delete().eq("id", id), [`/clientes/${organizationId}`]);
}

// -------------------------------------------------------------------- proyectos

const esquemaProyecto = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  end_client_id: z.string().uuid("Elige a qué cliente final pertenece"),
  name: z.string().trim().min(2, "El nombre es muy corto"),
  description: z.string().trim().optional(),
  status: z.enum(["activo", "pausado", "terminado", "archivado"]).default("activo"),
  due_date: z.string().trim().optional(),
});

export async function guardarProyecto(datos: FormData): Promise<Resultado> {
  const analizado = esquemaProyecto.safeParse(Object.fromEntries(datos));
  if (!analizado.success) return { ok: false, error: analizado.error.issues[0].message };

  const { id, ...campos } = analizado.data;
  const fila = {
    ...campos,
    description: campos.description || null,
    due_date: campos.due_date || null,
  };

  return ejecutar(
    (s) => (id ? s.from("projects").update(fila).eq("id", id) : s.from("projects").insert(fila)),
    [`/clientes/${campos.organization_id}`, "/"]
  );
}

export async function borrarProyecto(id: string, organizationId: string): Promise<Resultado> {
  return ejecutar((s) => s.from("projects").delete().eq("id", id), [`/clientes/${organizationId}`, "/"]);
}

// --------------------------------------------------------------- tipos de tarea

const esquemaTipo = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  name: z.string().trim().min(2, "El nombre es muy corto"),
  description: z.string().trim().optional(),
  default_priority: z.enum(["baja", "media", "alta", "urgente"]).default("media"),
  expected_days: z.coerce.number().int().min(0).max(365).optional(),
  is_active: z.coerce.boolean().default(true),
});

export async function guardarTipoDeTarea(datos: FormData): Promise<Resultado> {
  const crudo = Object.fromEntries(datos);
  const analizado = esquemaTipo.safeParse({ ...crudo, is_active: crudo.is_active === "on" || crudo.is_active === "true" });
  if (!analizado.success) return { ok: false, error: analizado.error.issues[0].message };

  const { id, ...campos } = analizado.data;
  const fila = {
    ...campos,
    description: campos.description || null,
    expected_days: campos.expected_days ?? null,
  };

  return ejecutar(
    (s) => (id ? s.from("task_types").update(fila).eq("id", id) : s.from("task_types").insert(fila)),
    [`/clientes/${campos.organization_id}`]
  );
}

export async function borrarTipoDeTarea(id: string, organizationId: string): Promise<Resultado> {
  return ejecutar((s) => s.from("task_types").delete().eq("id", id), [`/clientes/${organizationId}`]);
}

// ----------------------------------------------------------------- organización

const esquemaOrganizacion = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "El nombre es muy corto"),
  contact_email: z.string().trim().email("Ese correo no tiene un formato válido").optional().or(z.literal("")),
  contact_phone: z.string().trim().optional(),
  status: z.enum(["activo", "pausado", "archivado"]).default("activo"),
  notes: z.string().trim().optional(),
});

export async function guardarOrganizacion(datos: FormData): Promise<Resultado> {
  const analizado = esquemaOrganizacion.safeParse(Object.fromEntries(datos));
  if (!analizado.success) return { ok: false, error: analizado.error.issues[0].message };

  const { id, ...campos } = analizado.data;

  return ejecutar(
    (s) =>
      s
        .from("organizations")
        .update({
          ...campos,
          contact_email: campos.contact_email || null,
          contact_phone: campos.contact_phone || null,
          notes: campos.notes || null,
        })
        .eq("id", id),
    [`/clientes/${id}`, "/clientes", "/"]
  );
}

/**
 * Archivar es la baja de verdad, y es reversible. Desde la migración 006 una
 * organización archivada sale de my_org_ids(), así que su gente deja de ver el
 * portal en el acto: no es una etiqueta, les cierra la puerta.
 *
 * Se prefiere esto al borrado en todos los casos menos uno —el alta
 * equivocada—, porque conserva el historial y se puede deshacer.
 */
export async function cambiarEstadoOrganizacion(
  id: string,
  status: "activo" | "pausado" | "archivado"
): Promise<Resultado> {
  return ejecutar((s) => s.from("organizations").update({ status }).eq("id", id), [
    `/clientes/${id}`,
    "/clientes",
    "/",
  ]);
}

export type ConteoOrganizacion = {
  proyectos: number;
  clientesFinales: number;
  tareas: number;
  comentarios: number;
  adjuntos: number;
  miembros: number;
};

/**
 * Lo que se perdería al borrar. Va antes de la confirmación porque "esto
 * borrará 340 tareas y 51 adjuntos" es una advertencia y "¿estás seguro?" no.
 *
 * head: true pide solo el conteo, sin traerse las filas.
 */
export async function contarContenidoDeOrganizacion(id: string): Promise<ConteoOrganizacion> {
  const supabase = await crearClienteServidor();

  const contar = async (tabla: "projects" | "end_clients" | "tasks" | "comments" | "attachments" | "memberships") => {
    const { count } = await supabase
      .from(tabla)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", id);
    return count ?? 0;
  };

  const [proyectos, clientesFinales, tareas, comentarios, adjuntos, miembros] = await Promise.all([
    contar("projects"),
    contar("end_clients"),
    contar("tasks"),
    contar("comments"),
    contar("attachments"),
    contar("memberships"),
  ]);

  return { proyectos, clientesFinales, tareas, comentarios, adjuntos, miembros };
}
