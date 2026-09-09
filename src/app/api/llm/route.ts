import { NextResponse } from "next/server";
import { z } from "zod";

import { cifrar } from "@/lib/cifrado";
import { soloAdmin } from "@/lib/guardia";
import { necesitaLlave } from "@/lib/llm";
import { crearClienteAdmin } from "@/lib/supabase/admin";

const esquema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "ollama", "omniroute"]),
  model: z.string().trim().min(1, "Escribe el modelo"),
  base_url: z.string().trim().url("Esa URL no es válida").optional().or(z.literal("")),
  api_key: z.string().trim().optional(),
  is_active: z.boolean().default(true),
  daily_brief_hour: z.coerce.number().int().min(0).max(23).default(8),
  daily_brief_enabled: z.boolean().default(false),
  extra_instructions: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const guardia = await soloAdmin();
  if (guardia.error) return guardia.error;

  const analizado = esquema.safeParse(await request.json().catch(() => null));
  if (!analizado.success) {
    return NextResponse.json({ error: analizado.error.issues[0].message }, { status: 400 });
  }

  const { api_key, base_url, ...campos } = analizado.data;

  // llm_settings tiene RLS sin políticas: solo service_role la toca.
  const admin = crearClienteAdmin();

  const fila: {
    provider: string;
    model: string;
    base_url: string | null;
    extra_instructions: string | null;
    is_active: boolean;
    daily_brief_hour: number;
    daily_brief_enabled: boolean;
    api_key_ciphertext?: string;
    api_key_iv?: string;
    api_key_tag?: string;
    api_key_last4?: string;
  } = {
    ...campos,
    base_url: base_url || null,
    extra_instructions: campos.extra_instructions || null,
  };

  // La llave solo se reescribe cuando el dueño captura una nueva. Dejar el
  // campo vacío significa "no la toques", no "bórrala".
  if (api_key) {
    try {
      const { ciphertext, iv, tag, last4 } = cifrar(api_key);
      fila.api_key_ciphertext = ciphertext;
      fila.api_key_iv = iv;
      fila.api_key_tag = tag;
      fila.api_key_last4 = last4;
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "No se pudo cifrar la llave." },
        { status: 400 }
      );
    }
  }

  // Una pasarela propia no pide llave; los proveedores de paga sí.
  if (campos.is_active && necesitaLlave(campos.provider) && !api_key) {
    const { data: yaGuardada } = await admin
      .from("llm_settings")
      .select("api_key_ciphertext")
      .eq("provider", campos.provider)
      .maybeSingle();

    if (!yaGuardada?.api_key_ciphertext) {
      return NextResponse.json(
        { error: "Ese proveedor necesita una API key para poder usarse." },
        { status: 400 }
      );
    }
  }

  // Un solo proveedor activo a la vez.
  if (campos.is_active) {
    await admin.from("llm_settings").update({ is_active: false }).neq("provider", campos.provider);
  }

  const { error } = await admin.from("llm_settings").upsert(fila, { onConflict: "provider" });

  if (error) {
    return NextResponse.json({ error: `No se pudo guardar: ${error.message}` }, { status: 400 });
  }

  // La respuesta nunca lleva la llave, ni completa ni cifrada.
  return NextResponse.json({ ok: true });
}
