"use server";

import { revalidatePath } from "next/cache";

import type { Estado } from "@/lib/dominio";
import { PASO_NORMALIZADO } from "@/lib/orden";
import { crearClienteServidor } from "@/lib/supabase/server";

export type ResultadoMovimiento = { ok: boolean; error?: string };

/**
 * Mover una tarjeta actualiza UNA sola fila. El orden es fraccionario: al
 * soltar entre dos tarjetas, el nuevo valor es el promedio de sus vecinas.
 * Nunca se reescribe la columna completa.
 */
export async function moverTarea(
  id: string,
  status: Estado,
  sortOrder: number
): Promise<ResultadoMovimiento> {
  const supabase = await crearClienteServidor();

  const { error } = await supabase
    .from("tasks")
    .update({ status, sort_order: sortOrder })
    .eq("id", id);

  if (error) {
    // 42501 es el candado guard_task_update: el cliente no mueve tarjetas.
    return {
      ok: false,
      error:
        error.code === "42501"
          ? "Solo el administrador puede mover tarjetas."
          : "El servidor rechazó el movimiento.",
    };
  }

  return { ok: true };
}

/**
 * Reparte de nuevo los sort_order de una columna con separación de 1000.
 * Se llama en segundo plano cuando dos vecinas quedaron demasiado juntas;
 * el usuario no espera por esto.
 */
export async function renormalizarColumna(
  organizationId: string,
  status: Estado
): Promise<ResultadoMovimiento> {
  const supabase = await crearClienteServidor();

  const { data: tareas, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", status)
    .order("sort_order");

  if (error || !tareas) return { ok: false, error: error?.message };

  for (const [i, tarea] of tareas.entries()) {
    const { error: errorFila } = await supabase
      .from("tasks")
      .update({ sort_order: (i + 1) * PASO_NORMALIZADO })
      .eq("id", tarea.id);
    if (errorFila) return { ok: false, error: errorFila.message };
  }

  revalidatePath(`/clientes/${organizationId}`);
  return { ok: true };
}
