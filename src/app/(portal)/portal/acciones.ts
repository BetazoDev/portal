"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { crearClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; error?: string };

/**
 * Acciones del portal, aparte de las del dueño a propósito.
 *
 * Aquí no se importa nada que toque notas privadas ni movimientos de tablero:
 * si ese código no entra en este árbol, no hay forma de que se cuele al
 * navegador del cliente. RLS es el candado; esto es la puerta.
 */
async function ejecutar(
  accion: (
    supabase: Awaited<ReturnType<typeof crearClienteServidor>>
  ) => PromiseLike<{ error: { message: string } | null }>,
  rutas: string[]
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await accion(supabase);

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("row-level security") || error.message.includes("42501")
          ? "No tienes permiso para hacer ese cambio."
          : error.message,
    };
  }

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
    notes: campos.notes || null,
  };

  return ejecutar(
    (s) => (id ? s.from("end_clients").update(fila).eq("id", id) : s.from("end_clients").insert(fila)),
    ["/portal"]
  );
}

export async function borrarClienteFinal(id: string): Promise<Resultado> {
  return ejecutar((s) => s.from("end_clients").delete().eq("id", id), ["/portal"]);
}

// -------------------------------------------------------------------- proyectos

const esquemaProyecto = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  end_client_id: z.string().uuid("Elige a qué cliente pertenece"),
  name: z.string().trim().min(2, "El nombre es muy corto"),
  description: z.string().trim().optional(),
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
    ["/portal"]
  );
}

export async function borrarProyecto(id: string): Promise<Resultado> {
  return ejecutar((s) => s.from("projects").delete().eq("id", id), ["/portal"]);
}

// ----------------------------------------------------------------------- tareas

const esquemaTarea = z.object({
  organization_id: z.string().uuid(),
  project_id: z.string().uuid("Elige el proyecto"),
  task_type_id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3, "Ponle un título que se entienda"),
  description: z.string().trim().optional(),
  due_date: z.string().trim().optional(),
});

/**
 * El cliente crea tareas y siempre caen en la columna Nuevas. La política de
 * RLS lo obliga: status = 'nuevo' y created_by = auth.uid(). Aquí se manda
 * explícito para que el rechazo, si llega, sea por otra cosa y no por esto.
 */
export async function crearTarea(datos: FormData): Promise<Resultado> {
  const analizado = esquemaTarea.safeParse(Object.fromEntries(datos));
  if (!analizado.success) return { ok: false, error: analizado.error.issues[0].message };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró." };

  const { task_type_id, due_date, description, ...campos } = analizado.data;

  const { error } = await supabase.from("tasks").insert({
    ...campos,
    task_type_id: task_type_id || null,
    due_date: due_date || null,
    description: description || null,
    status: "nuevo",
    created_by: user.id,
  });

  if (error) return { ok: false, error: "No se pudo crear la tarea." };

  revalidatePath("/portal", "layout");
  redirect("/portal");
}

export async function agregarComentario(taskId: string, cuerpo: string): Promise<Resultado> {
  const texto = cuerpo.trim();
  if (!texto) return { ok: false, error: "Escribe algo antes de enviar." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró." };

  const { data: tarea } = await supabase
    .from("tasks")
    .select("organization_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!tarea) return { ok: false, error: "Esa tarea ya no existe." };

  const { error } = await supabase.from("comments").insert({
    task_id: taskId,
    organization_id: tarea.organization_id,
    author_id: user.id,
    body: texto,
  });

  if (error) return { ok: false, error: "No se pudo publicar el comentario." };

  revalidatePath(`/portal/tareas/${taskId}`);
  return { ok: true };
}

export async function urlDeDescarga(rutaStorage: string): Promise<{ url?: string; error?: string }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.storage
    .from("task-attachments")
    .createSignedUrl(rutaStorage, 60);

  if (error || !data) return { error: "No se pudo preparar la descarga." };
  return { url: data.signedUrl };
}

/**
 * El cliente también adjunta: pantallazos del error, logos, machotes. RLS
 * sobre attachments y sobre storage.objects lo limita a su organización.
 */
export async function registrarAdjunto(
  taskId: string,
  organizationId: string,
  rutaStorage: string,
  nombre: string,
  tipo: string,
  bytes: number
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró." };

  const { error } = await supabase.from("attachments").insert({
    task_id: taskId,
    organization_id: organizationId,
    storage_path: rutaStorage,
    file_name: nombre,
    mime_type: tipo,
    size_bytes: bytes,
    uploaded_by: user.id,
  });

  if (error) return { ok: false, error: "No se pudo registrar el archivo." };

  revalidatePath(`/portal/tareas/${taskId}`);
  return { ok: true };
}

/**
 * El portal no mueve tarjetas. Existe solo para que el tablero compartido
 * reciba algo donde el del dueño recibe moverTarea, y para dejar por escrito
 * que el candado real está en el trigger guard_task_update.
 */
export async function movimientoNoPermitido(): Promise<Resultado> {
  return { ok: false, error: "Solo el administrador puede mover tarjetas." };
}

/** Lo mismo para el detalle: el cliente lo lee, no lo edita. */
export async function cambioNoPermitido(): Promise<Resultado> {
  return { ok: false, error: "Solo el administrador puede cambiar esto." };
}
