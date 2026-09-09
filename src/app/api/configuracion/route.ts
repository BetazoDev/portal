import { NextResponse } from "next/server";
import { z } from "zod";

import { soloAdmin } from "@/lib/guardia";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * URL sin diagonal final.
 *
 * El navegador la añade sola al copiar del barra de direcciones, y con ella
 * app_base_url produce enlaces como https://dominio//tareas/… en los correos.
 * Se normaliza al guardar en vez de confiar en que quien la pegue se acuerde.
 */
const urlSinBarraFinal = z
  .string()
  .trim()
  .url("Esa URL no es válida")
  .transform((valor) => valor.replace(/\/+$/, ""));

const esquema = z.object({
  full_name: z.string().trim().min(2, "Escribe tu nombre").optional(),
  n8n_webhook_url: urlSinBarraFinal.optional().or(z.literal("")),
  n8n_webhook_secret: z.string().trim().optional(),
  app_base_url: urlSinBarraFinal.optional().or(z.literal("")),
  admin_email: z.string().trim().email("Ese correo no es válido").optional().or(z.literal("")),
});

/**
 * app_config tiene RLS sin políticas a propósito: ni el dueño la lee con su
 * propia sesión. Se escribe desde aquí, con service_role, y solo después de
 * comprobar que quien llama es platform_admin.
 */
export async function POST(request: Request) {
  const guardia = await soloAdmin();
  if (guardia.error) return guardia.error;

  const analizado = esquema.safeParse(await request.json().catch(() => null));
  if (!analizado.success) {
    return NextResponse.json({ error: analizado.error.issues[0].message }, { status: 400 });
  }

  const admin = crearClienteAdmin();
  const { full_name, ...config } = analizado.data;

  if (full_name) {
    await admin.from("profiles").update({ full_name }).eq("id", guardia.usuario!.id);
  }

  const filas = Object.entries(config)
    .filter(([, valor]) => valor !== undefined && valor !== "")
    .map(([key, value]) => ({ key, value: String(value) }));

  if (filas.length > 0) {
    const { error } = await admin.from("app_config").upsert(filas, { onConflict: "key" });
    if (error) {
      return NextResponse.json({ error: `No se pudo guardar: ${error.message}` }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
