import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

import type { Database } from "@/lib/supabase/tipos";

export type Estado = Database["public"]["Enums"]["task_status"];
export type Prioridad = Database["public"]["Enums"]["task_priority"];

/** El orden del arreglo es el orden de las columnas del tablero. */
export const COLUMNAS: { estado: Estado; etiqueta: string }[] = [
  { estado: "nuevo", etiqueta: "Nuevas" },
  { estado: "en_revision", etiqueta: "En revisión" },
  { estado: "en_progreso", etiqueta: "En progreso" },
  { estado: "esperando_cliente", etiqueta: "Esperando cliente" },
  { estado: "hecho", etiqueta: "Hecho" },
  { estado: "cancelado", etiqueta: "Cancelado" },
];

export const ETIQUETA_ESTADO: Record<Estado, string> = Object.fromEntries(
  COLUMNAS.map((c) => [c.estado, c.etiqueta])
) as Record<Estado, string>;

export const PRIORIDADES: { prioridad: Prioridad; etiqueta: string }[] = [
  { prioridad: "baja", etiqueta: "Baja" },
  { prioridad: "media", etiqueta: "Media" },
  { prioridad: "alta", etiqueta: "Alta" },
  { prioridad: "urgente", etiqueta: "Urgente" },
];

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = Object.fromEntries(
  PRIORIDADES.map((p) => [p.prioridad, p.etiqueta])
) as Record<Prioridad, string>;

/** "14 de septiembre", como pide el documento. */
export function formatearFecha(fecha: string | Date) {
  const d = typeof fecha === "string" ? parseISO(fecha) : fecha;
  return format(d, "d 'de' MMMM", { locale: es });
}

/** Una tarea vence si tiene fecha pasada y sigue abierta. */
export function estaVencida(fecha: string | null, estado: Estado) {
  if (!fecha) return false;
  if (estado === "hecho" || estado === "cancelado") return false;
  return isBefore(parseISO(fecha), startOfDay(new Date()));
}
