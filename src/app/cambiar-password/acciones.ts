"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";

const MINIMO = 10;

const esquema = z
  .object({
    password: z.string().min(MINIMO, `La contraseña necesita al menos ${MINIMO} caracteres`),
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, {
    message: "Las dos contraseñas no son iguales",
    path: ["confirmacion"],
  });

export type EstadoCambio = { error?: string };

export async function cambiarPassword(
  _previo: EstadoCambio,
  datos: FormData
): Promise<EstadoCambio> {
  const analizado = esquema.safeParse({
    password: datos.get("password"),
    confirmacion: datos.get("confirmacion"),
  });

  if (!analizado.success) {
    return { error: analizado.error.issues[0].message };
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: analizado.data.password });

  if (error) {
    return {
      error:
        "No se pudo guardar la contraseña. Prueba con una distinta a la que ya tenías o vuelve a entrar.",
    };
  }

  // Las banderas del perfil se escriben con service_role, no con la sesión del
  // usuario: así el candado de la migración 004 puede prohibirle tocar su
  // propia fila sin romper este flujo.
  const admin = crearClienteAdmin();
  const { data: perfil, error: errorPerfil } = await admin
    .from("profiles")
    .update({ must_change_password: false, password_set_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("role")
    .single();

  if (errorPerfil) {
    return {
      error:
        "Tu contraseña sí cambió, pero no pudimos marcar tu cuenta como lista. Vuelve a entrar y avísanos si te lo sigue pidiendo.",
    };
  }

  revalidatePath("/", "layout");
  // Mandarlo siempre a "/" haría que el middleware le respondiera 404 al
  // usuario de cliente, porque la raíz es la pantalla del dueño.
  redirect(perfil.role === "platform_admin" ? "/" : "/portal");
}
