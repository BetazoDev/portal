"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { crearClienteServidor } from "@/lib/supabase/server";

const esquema = z.object({
  email: z.string().trim().min(1, "Escribe tu correo").email("Ese correo no tiene un formato válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
  volver: z.string().optional(),
});

export type EstadoLogin = { error?: string };

/**
 * "volver" viene de la URL, así que es entrada del usuario. Sin este filtro,
 * un enlace del tipo /login?volver=https://sitio-falso.mx convertiría el login
 * en un redirector abierto.
 *
 * El inicio depende del rol: la raíz es la pantalla del dueño, y mandar ahí a
 * un usuario de cliente le devolvería el 404 del middleware.
 */
function destinoSeguro(volver: string | undefined, esAdmin: boolean) {
  const inicio = esAdmin ? "/" : "/portal";
  if (!volver) return inicio;
  if (!volver.startsWith("/") || volver.startsWith("//")) return inicio;
  if (!esAdmin && volver !== "/portal" && !volver.startsWith("/portal/")) return inicio;
  return volver;
}

export async function entrar(_previo: EstadoLogin, datos: FormData): Promise<EstadoLogin> {
  const analizado = esquema.safeParse({
    email: datos.get("email"),
    password: datos.get("password"),
    volver: datos.get("volver") ?? undefined,
  });

  if (!analizado.success) {
    return { error: analizado.error.issues[0].message };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: analizado.data.email,
    password: analizado.data.password,
  });

  if (error) {
    // Mismo mensaje para correo inexistente y contraseña incorrecta: decir
    // cuál de los dos falló permite averiguar qué correos están dados de alta.
    return { error: "El correo o la contraseña no coinciden. Inténtalo de nuevo." };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  revalidatePath("/", "layout");
  // Si trae contraseña temporal, el middleware lo intercepta y lo lleva a
  // /cambiar-password antes de que llegue a este destino.
  redirect(destinoSeguro(analizado.data.volver, perfil?.role === "platform_admin"));
}
