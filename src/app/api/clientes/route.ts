import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { avisarAn8n } from "@/lib/n8n";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";
import { aSlug } from "@/lib/texto";

const esquema = z.object({
  nombre: z.string().trim().min(2, "El nombre del cliente es muy corto"),
  email: z.string().trim().toLowerCase().email("Ese correo no tiene un formato válido"),
  nombreContacto: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  notas: z.string().trim().optional(),
});

/** 16 caracteres, alfabeto sin l, I, 1, O ni 0 para poder dictarla por teléfono. */
function passwordTemporal() {
  const alfabeto = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(16), (b) => alfabeto[b % alfabeto.length]).join("");
}

export async function POST(request: Request) {
  // 0. Quien llama tiene que ser el dueño. Se verifica con SU sesión, no con
  //    la service_role, que se saltaría el RLS y respondería que sí a cualquiera.
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Necesitas una sesión abierta." }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.role !== "platform_admin") {
    // 404 y no 403: confirmarle que este endpoint existe ya sería filtrar.
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const cuerpo = await request.json().catch(() => null);
  const analizado = esquema.safeParse(cuerpo);
  if (!analizado.success) {
    return NextResponse.json({ error: analizado.error.issues[0].message }, { status: 400 });
  }

  const { nombre, email, nombreContacto, telefono, notas } = analizado.data;
  const admin = crearClienteAdmin();

  // 1. La organización. El trigger le siembra los seis tipos de tarea base.
  const { data: organizacion, error: errorOrg } = await admin
    .from("organizations")
    .insert({
      name: nombre,
      slug: `${aSlug(nombre)}-${randomBytes(3).toString("hex")}`,
      contact_email: email,
      contact_phone: telefono || null,
      notes: notas || null,
    })
    .select("id, name, slug")
    .single();

  if (errorOrg || !organizacion) {
    return NextResponse.json(
      { error: `No se pudo crear el cliente: ${errorOrg?.message ?? "sin detalle"}` },
      { status: 400 }
    );
  }

  const organizacionId = organizacion.id;

  // 2 y 3. Contraseña temporal y usuario. La contraseña vive en esta variable
  //        y en el correo que manda n8n. En ninguna tabla, en ningún log.
  const password = passwordTemporal();
  const { data: creado, error: errorUsuario } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nombreContacto || nombre },
  });

  if (errorUsuario || !creado?.user) {
    await admin.from("organizations").delete().eq("id", organizacionId);
    return NextResponse.json(
      { error: `No se pudo crear el acceso: ${errorUsuario?.message ?? "error desconocido"}` },
      { status: 400 }
    );
  }

  const usuarioId = creado.user.id;

  /** Un usuario sin membresía deja el sistema inconsistente: se revierte todo. */
  async function revertir(mensaje: string) {
    await admin.auth.admin.deleteUser(usuarioId);
    await admin.from("organizations").delete().eq("id", organizacionId);
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }

  // 4. Marca de contraseña temporal.
  const { error: errorPerfil } = await admin
    .from("profiles")
    .update({
      must_change_password: true,
      invited_at: new Date().toISOString(),
      full_name: nombreContacto || nombre,
    })
    .eq("id", usuarioId);

  if (errorPerfil) return revertir(`No se pudo preparar el perfil: ${errorPerfil.message}`);

  // 5. Membresía como dueño de su agencia.
  const { error: errorMembresia } = await admin.from("memberships").insert({
    profile_id: usuarioId,
    organization_id: organizacionId,
    role: "client_owner",
  });

  if (errorMembresia) return revertir(`No se pudo dar el acceso: ${errorMembresia.message}`);

  // 6. El único envío de la contraseña en claro. No vuelve en esta respuesta.
  const aviso = await avisarAn8n("user.created", {
    organization: { id: organizacionId, name: organizacion.name },
    user: { id: usuarioId, email, name: nombreContacto || nombre },
    credentials: { email, password },
    app_url: process.env.NEXT_PUBLIC_APP_URL ?? "",
  });

  return NextResponse.json({
    organizacion: { id: organizacionId, nombre: organizacion.name },
    correoEnviado: aviso.entregado,
    avisoPendiente: aviso.entregado ? null : aviso.motivo,
    /*
     * Excepción deliberada a la regla de la sección 8, y la única.
     *
     * Cuando n8n entrega el correo, la contraseña no vuelve nunca: sale de
     * aquí hacia el webhook y se acabó. Pero si n8n no está configurado o no
     * responde, el cliente quedaría creado sin forma de entrar jamás, y el
     * dueño sin saber su contraseña. En ese caso —y solo en ese— se devuelve
     * una vez para que él se la haga llegar por su cuenta.
     *
     * Sigue sin guardarse en ninguna tabla ni escribirse en ningún log.
     */
    passwordParaEntregarAMano: aviso.entregado ? null : password,
  });
}
