import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, formatearFecha, type Estado, type Prioridad } from "@/lib/dominio";

type Cambio = { field: string; from?: string | null; to?: string | null };

type Payload = {
  event?: string;
  changes?: Cambio[];
  actor?: { name?: string | null; email?: string | null } | null;
  comment?: { body?: string } | null;
};

/** "Humberto" a partir de "Humberto Alonso"; si no hay nombre, el correo. */
function nombreCorto(actor: Payload["actor"]) {
  const completo = actor?.name?.trim();
  if (completo) return completo.split(/\s+/)[0];
  return actor?.email?.split("@")[0] ?? "Alguien";
}

function frasePorCambio(cambio: Cambio): string {
  switch (cambio.field) {
    case "status":
      return `movió esta tarea a ${ETIQUETA_ESTADO[cambio.to as Estado] ?? cambio.to}`;
    case "priority":
      return `cambió la prioridad a ${ETIQUETA_PRIORIDAD[cambio.to as Prioridad] ?? cambio.to}`;
    case "due_date":
      return cambio.to
        ? `puso la entrega el ${formatearFecha(cambio.to)}`
        : "quitó la fecha de entrega";
    case "assigned_to":
      return "cambió a quién está asignada";
    case "title":
      return "cambió el título";
    default:
      return `actualizó ${cambio.field}`;
  }
}

/**
 * La bitácora en lenguaje humano. Un solo evento puede traer varios cambios;
 * se redactan juntos, igual que en el correo.
 */
export function describirEvento(tipo: string, payload: Payload): string {
  const quien = nombreCorto(payload.actor);

  if (tipo === "task.created") return `${quien} creó esta tarea`;
  if (tipo === "comment.created") return `${quien} escribió un comentario`;

  const cambios = payload.changes ?? [];
  if (cambios.length === 0) return `${quien} actualizó esta tarea`;

  const frases = cambios.map(frasePorCambio);
  if (frases.length === 1) return `${quien} ${frases[0]}`;

  const ultima = frases.pop();
  return `${quien} ${frases.join(", ")} y ${ultima}`;
}
