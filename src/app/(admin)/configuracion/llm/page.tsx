import type { Metadata } from "next";

import { crearClienteServidor } from "@/lib/supabase/server";

import { FormularioLlm } from "./formulario";

export const metadata: Metadata = { title: "Modelo" };

export default async function PaginaLlm() {
  const supabase = await crearClienteServidor();

  // get_llm_settings devuelve los últimos cuatro caracteres y nada más: el
  // ciphertext no sale de la base ni para el dueño.
  const { data } = await supabase.rpc("get_llm_settings");
  const activo = (data ?? []).find((a) => a.is_active) ?? (data ?? [])[0] ?? null;

  return (
    <main className="max-w-2xl p-6">
      <FormularioLlm ajustes={activo} />
    </main>
  );
}
