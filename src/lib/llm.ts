import "server-only";

import { necesitaLlave, PROVEEDORES, type Proveedor } from "@/lib/proveedores";

export { necesitaLlave, PROVEEDORES };
export type { Proveedor };

type Peticion = {
  proveedor: Proveedor;
  modelo: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  sistema: string;
  usuario: string;
  maxTokens?: number;
};

export type RespuestaLLM =
  | { ok: true; texto: string; uso: Record<string, unknown> | null }
  | { ok: false; error: string };

/**
 * Una sola función para los cinco proveedores. No se usa el SDK de cada uno
 * porque serían cinco dependencias para una llamada de texto plano.
 */
export async function pedirAlModelo(p: Peticion): Promise<RespuestaLLM> {
  try {
    switch (p.proveedor) {
      case "anthropic":
        return await anthropic(p);
      case "openai":
        return await compatibleConOpenAI(p, p.baseUrl || "https://api.openai.com/v1");
      case "ollama":
        return await compatibleConOpenAI(p, p.baseUrl || "http://localhost:11434/v1");
      case "omniroute":
        return await compatibleConOpenAI(p, p.baseUrl || "http://localhost:20128/v1");
      case "google":
        return await google(p);
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo contactar al modelo." };
  }
}

async function anthropic(p: Peticion): Promise<RespuestaLLM> {
  const respuesta = await fetch(`${p.baseUrl || "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": p.apiKey ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: p.modelo,
      max_tokens: p.maxTokens ?? 1500,
      system: p.sistema,
      messages: [{ role: "user", content: p.usuario }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    return { ok: false, error: cuerpo?.error?.message ?? `El modelo respondió ${respuesta.status}` };
  }

  const texto = (cuerpo.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");

  return { ok: true, texto, uso: cuerpo.usage ?? null };
}

async function compatibleConOpenAI(p: Peticion, base: string): Promise<RespuestaLLM> {
  const cabeceras: Record<string, string> = { "Content-Type": "application/json" };
  // Sin llave no se manda cabecera de autorización: una pasarela local que no
  // la pide devolvería 401 si le llega un "Bearer " vacío.
  if (p.apiKey) cabeceras.Authorization = `Bearer ${p.apiKey}`;

  const respuesta = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({
      model: p.modelo,
      max_tokens: p.maxTokens ?? 1500,
      messages: [
        { role: "system", content: p.sistema },
        { role: "user", content: p.usuario },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });

  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    return { ok: false, error: cuerpo?.error?.message ?? `El modelo respondió ${respuesta.status}` };
  }

  return {
    ok: true,
    texto: cuerpo.choices?.[0]?.message?.content ?? "",
    uso: cuerpo.usage ?? null,
  };
}

async function google(p: Peticion): Promise<RespuestaLLM> {
  const base = p.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  const respuesta = await fetch(`${base}/models/${p.modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": p.apiKey ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: p.sistema }] },
      contents: [{ role: "user", parts: [{ text: p.usuario }] }],
      generationConfig: { maxOutputTokens: p.maxTokens ?? 1500 },
    }),
    signal: AbortSignal.timeout(60000),
  });

  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    return { ok: false, error: cuerpo?.error?.message ?? `El modelo respondió ${respuesta.status}` };
  }

  const texto = (cuerpo.candidates?.[0]?.content?.parts ?? [])
    .map((parte: { text?: string }) => parte.text ?? "")
    .join("");

  return { ok: true, texto, uso: cuerpo.usageMetadata ?? null };
}
