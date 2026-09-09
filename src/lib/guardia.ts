import "server-only";

import { NextResponse } from "next/server";

import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Verifica que quien llama sea el dueño, usando SU sesión y no la
 * service_role, que se saltaría el RLS y le diría que sí a cualquiera.
 *
 * Devuelve 404 y no 403: confirmarle a un usuario de cliente que el endpoint
 * existe ya sería filtrar información.
 */
export async function soloAdmin() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Necesitas una sesión abierta." }, { status: 401 }) };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.role !== "platform_admin") {
    return { error: NextResponse.json({ error: "No encontrado." }, { status: 404 }) };
  }

  return { usuario: user, supabase };
}
