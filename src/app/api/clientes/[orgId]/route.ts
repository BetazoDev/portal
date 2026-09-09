import { NextResponse } from "next/server";
import { z } from "zod";

import { soloAdmin } from "@/lib/guardia";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Borrado definitivo de una agencia.
 *
 * Existe solo para el caso del alta equivocada. Para dar de baja a un cliente
 * de verdad está archivar, que conserva el historial y se puede deshacer.
 *
 * Hace falta la service_role para dos cosas que la sesión del dueño no puede
 * hacer por más platform_admin que sea: borrar usuarios del esquema auth, que
 * no está expuesto por PostgREST, y vaciar el bucket.
 *
 * El orden importa y no es intercambiable:
 *   1. leer los miembros    — después del borrado ya no existen las membresías
 *   2. vaciar el bucket     — los archivos no cuelgan de ninguna llave foránea,
 *                             así que el cascade no los toca y quedarían para
 *                             siempre, ocupando espacio y sin nadie que los liste
 *   3. borrar la fila       — el cascade se lleva proyectos, clientes finales,
 *                             tareas, comentarios, adjuntos y membresías
 *   4. borrar los usuarios  — solo los que se quedan sin ninguna otra agencia
 */

const esquema = z.object({
  confirmacion: z.string(),
});

export async function DELETE(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const guardia = await soloAdmin();
  if ("error" in guardia) return guardia.error;

  const { orgId } = await params;

  const cuerpo = await request.json().catch(() => null);
  const analizado = esquema.safeParse(cuerpo);
  if (!analizado.success) {
    return NextResponse.json({ error: "Falta la confirmación." }, { status: 400 });
  }

  const admin = crearClienteAdmin();

  const { data: organizacion } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();

  if (!organizacion) {
    return NextResponse.json({ error: "Ese cliente ya no existe." }, { status: 404 });
  }

  // El nombre escrito a mano es la única barrera contra el clic accidental.
  // Se compara sin espacios de sobra, pero respetando mayúsculas: si no lo
  // escribes tal cual, no se borra.
  if (analizado.data.confirmacion.trim() !== organizacion.name.trim()) {
    return NextResponse.json(
      { error: `Para confirmar hay que escribir exactamente: ${organizacion.name}` },
      { status: 400 }
    );
  }

  // 1. Los miembros, antes de que el cascade se lleve las membresías.
  const { data: membresias } = await admin
    .from("memberships")
    .select("profile_id")
    .eq("organization_id", orgId);

  const idsDeMiembros = [...new Set((membresias ?? []).map((m) => m.profile_id))];

  // 2. El bucket. Se recorre el prefijo de la organización en vez de confiar en
  //    la tabla attachments, porque así también se llevan los huérfanos: los
  //    archivos que se subieron y cuyo registro falló después.
  const rutas: string[] = [];
  const { data: carpetas } = await admin.storage.from("task-attachments").list(orgId, { limit: 1000 });

  for (const carpeta of carpetas ?? []) {
    // Una entrada sin id es una carpeta; con id, un objeto suelto en la raíz.
    if (carpeta.id) {
      rutas.push(`${orgId}/${carpeta.name}`);
      continue;
    }
    const { data: archivos } = await admin.storage
      .from("task-attachments")
      .list(`${orgId}/${carpeta.name}`, { limit: 1000 });
    for (const archivo of archivos ?? []) {
      rutas.push(`${orgId}/${carpeta.name}/${archivo.name}`);
    }
  }

  let archivosBorrados = 0;
  if (rutas.length > 0) {
    // remove() acepta lotes; se parte para no armar una petición enorme.
    for (let i = 0; i < rutas.length; i += 100) {
      const lote = rutas.slice(i, i + 100);
      const { error } = await admin.storage.from("task-attachments").remove(lote);
      if (!error) archivosBorrados += lote.length;
    }
  }

  // 3. La fila. El cascade hace el resto.
  const { error: errorBorrado } = await admin.from("organizations").delete().eq("id", orgId);

  if (errorBorrado) {
    return NextResponse.json(
      { error: `No se pudo borrar el cliente: ${errorBorrado.message}` },
      { status: 400 }
    );
  }

  // 4. Los usuarios que se quedaron sin nada. Se comprueba uno por uno si le
  //    queda alguna otra agencia: un contacto puede trabajar para dos.
  //    Un platform_admin no se toca nunca, aunque tuviera una membresía.
  let usuariosBorrados = 0;

  for (const profileId of idsDeMiembros) {
    const { count } = await admin
      .from("memberships")
      .select("profile_id", { count: "exact", head: true })
      .eq("profile_id", profileId);

    if ((count ?? 0) > 0) continue;

    const { data: perfil } = await admin
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .maybeSingle();

    if (perfil?.role === "platform_admin") continue;

    const { error } = await admin.auth.admin.deleteUser(profileId);
    if (!error) usuariosBorrados += 1;
  }

  return NextResponse.json({
    nombre: organizacion.name,
    archivosBorrados,
    usuariosBorrados,
  });
}
