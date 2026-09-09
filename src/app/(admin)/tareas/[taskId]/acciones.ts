"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { seSirveEnLinea } from "@/lib/adjuntos";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; error?: string };

const esquemaTarea = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2, "El título es muy corto").optional(),
  status: z
    .enum(["nuevo", "en_revision", "en_progreso", "esperando_cliente", "hecho", "cancelado"])
    .optional(),
  priority: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  due_date: z.string().nullable().optional(),
  task_type_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().optional(),
  description: z.string().nullable().optional(),
});

/**
 * Recibe el objeto sin tipar a propósito: viene del cliente, así que lo que
 * vale es lo que apruebe zod, no lo que diga TypeScript.
 */
export async function actualizarTarea(cambios: Record<string, unknown>): Promise<Resultado> {
  const analizado = esquemaTarea.safeParse(cambios);
  if (!analizado.success) return { ok: false, error: analizado.error.issues[0].message };

  const { id, ...campos } = analizado.data;
  const supabase = await crearClienteServidor();

  const { error } = await supabase.from("tasks").update(campos).eq("id", id);

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42501"
          ? "Solo el administrador puede cambiar esto."
          : "No se pudo guardar el cambio.",
    };
  }

  revalidatePath(`/tareas/${id}`);
  return { ok: true };
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

  revalidatePath(`/tareas/${taskId}`);
  return { ok: true };
}

/**
 * Notas privadas del dueño. RLS ya las limita a platform_admin; esta acción
 * nunca se importa desde el árbol del portal del cliente.
 */
export async function guardarNotasPrivadas(
  taskId: string,
  cuerpo: string,
  checklist: { id: string; text: string; done: boolean }[]
): Promise<Resultado> {
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

  const { error } = await supabase.from("task_private_notes").upsert(
    {
      task_id: taskId,
      organization_id: tarea.organization_id,
      author_id: user.id,
      body: cuerpo,
      checklist,
    },
    { onConflict: "task_id" }
  );

  if (error) return { ok: false, error: "No se pudieron guardar las notas." };
  return { ok: true };
}

/** URL firmada de vigencia corta. Los adjuntos nunca se sirven públicos. */
/**
 * Los pantallazos y los PDF se abren en el navegador, que es lo cómodo para
 * revisarlos. Todo lo demás se sirve con Content-Disposition: attachment.
 *
 * No es cosmético: un SVG es XML y puede llevar <script> dentro. Servido en
 * línea, ese código se ejecutaría con la URL firmada en el dominio de
 * Supabase. Forzando la descarga el navegador lo guarda en vez de
 * interpretarlo, y por eso se puede aceptar SVG sin sobresaltos.
 */
export async function urlDeDescarga(rutaStorage: string): Promise<{ url?: string; error?: string }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.storage
    .from("task-attachments")
    .createSignedUrl(rutaStorage, 60, seSirveEnLinea(rutaStorage) ? {} : { download: true });

  if (error || !data) return { error: "No se pudo preparar la descarga." };
  return { url: data.signedUrl };
}

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

  revalidatePath(`/tareas/${taskId}`);
  return { ok: true };
}
