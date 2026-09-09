import { NextResponse } from "next/server";
import { z } from "zod";

import { descifrar } from "@/lib/cifrado";
import { soloAdmin } from "@/lib/guardia";
import { necesitaLlave, pedirAlModelo, type Proveedor } from "@/lib/llm";
import { crearClienteAdmin } from "@/lib/supabase/admin";

const esquema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "ollama", "omniroute"]),
  model: z.string().trim().min(1),
  base_url: z.string().trim().optional(),
  /** Si viene, se prueba ésta sin guardarla. Si no, se usa la ya guardada. */
  api_key: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const guardia = await soloAdmin();
  if (guardia.error) return guardia.error;

  const analizado = esquema.safeParse(await request.json().catch(() => null));
  if (!analizado.success) {
    return NextResponse.json({ error: analizado.error.issues[0].message }, { status: 400 });
  }

  const { provider, model, base_url } = analizado.data;
  let apiKey = analizado.data.api_key;

  if (!apiKey && necesitaLlave(provider)) {
    const admin = crearClienteAdmin();
    const { data } = await admin
      .from("llm_settings")
      .select("api_key_ciphertext, api_key_iv, api_key_tag")
      .eq("provider", provider)
      .maybeSingle();

    if (!data?.api_key_ciphertext || !data.api_key_iv || !data.api_key_tag) {
      return NextResponse.json(
        { error: "No hay una llave guardada para ese proveedor. Captúrala antes de probar." },
        { status: 400 }
      );
    }

    try {
      apiKey = descifrar(data.api_key_ciphertext, data.api_key_iv, data.api_key_tag);
    } catch {
      return NextResponse.json(
        {
          error:
            "La llave guardada no se puede descifrar. Suele pasar cuando cambió CRM_ENCRYPTION_KEY: captúrala de nuevo.",
        },
        { status: 400 }
      );
    }
  }

  const respuesta = await pedirAlModelo({
    proveedor: provider as Proveedor,
    modelo: model,
    baseUrl: base_url || null,
    apiKey: apiKey ?? null,
    sistema: "Responde con una sola palabra.",
    usuario: "Contesta exactamente: listo",
    maxTokens: 16,
  });

  if (!respuesta.ok) return NextResponse.json({ error: respuesta.error }, { status: 400 });

  return NextResponse.json({ ok: true, respuesta: respuesta.texto.trim().slice(0, 60) });
}
