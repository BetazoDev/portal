import "server-only";

import { envServidor } from "@/lib/env";

/**
 * Aviso a n8n desde el servidor. Los eventos de tareas y comentarios los manda
 * Postgres por trigger; este camino es solo para lo que no pasa por la base,
 * como el alta de usuario con su contraseña temporal.
 *
 * Nunca lanza: que falle el correo no puede tumbar el alta de un cliente.
 * Devuelve si se entregó, para poder reportarlo.
 */
export async function avisarAn8n(evento: string, datos: Record<string, unknown>) {
  const { N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET } = envServidor();

  if (!N8N_WEBHOOK_URL) {
    return { entregado: false, motivo: "N8N_WEBHOOK_URL sin configurar" as const };
  }

  try {
    const respuesta = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CRM-Secret": N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({ event: evento, ...datos }),
      signal: AbortSignal.timeout(8000),
    });

    return respuesta.ok
      ? { entregado: true as const }
      : { entregado: false as const, motivo: `n8n respondió ${respuesta.status}` };
  } catch (e) {
    return {
      entregado: false as const,
      motivo: e instanceof Error ? e.message : "no se pudo conectar con n8n",
    };
  }
}
