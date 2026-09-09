/**
 * Alta y promoción del dueño de la plataforma.
 *
 *   node --env-file=.env.local scripts/crear-admin.mjs correo@dominio.com
 *
 * Si el usuario ya existe, solo lo promueve. Si no, lo crea con una
 * contraseña temporal que se imprime UNA VEZ en esta terminal y no se guarda
 * en ninguna tabla. El middleware lo mandará a /cambiar-password en el primer
 * acceso.
 *
 * Es el único punto del sistema donde una contraseña aparece en pantalla, y
 * existe porque el primer administrador no puede darse de alta a sí mismo.
 */

import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];

if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/crear-admin.mjs correo@dominio.com");
  process.exit(1);
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

/** 16 caracteres de alfabeto sin ambigüedades: nada de l, I, 1, O ni 0. */
function passwordTemporal() {
  const alfabeto = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

const { data: lista, error: errorLista } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (errorLista) {
  console.error("No se pudo consultar los usuarios:", errorLista.message);
  process.exit(1);
}

const existente = lista.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
let id = existente?.id;
let password = null;

if (!existente) {
  password = passwordTemporal();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("No se pudo crear el usuario:", error.message);
    process.exit(1);
  }
  id = data.user.id;
}

const { error: errorPerfil } = await admin
  .from("profiles")
  .update({
    role: "platform_admin",
    ...(password ? { must_change_password: true, invited_at: new Date().toISOString() } : {}),
  })
  .eq("id", id);

if (errorPerfil) {
  console.error("No se pudo promover el perfil:", errorPerfil.message);
  process.exit(1);
}

// El payload que va a n8n usa este correo como destinatario del dueño.
await admin.from("app_config").upsert({ key: "admin_email", value: email });

console.log();
console.log(existente ? "Usuario ya existía, solo se promovió." : "Usuario creado.");
console.log("  correo :", email);
console.log("  rol    : platform_admin");
if (password) {
  console.log("  clave  :", password, " ← temporal, se pide cambiarla al entrar");
  console.log();
  console.log("Esta contraseña no se guardó en ninguna parte. Si la pierdes, vuelve a correr");
  console.log("el script después de borrar el usuario, o cámbiala desde Supabase Studio.");
}
console.log();
console.log("app_config.admin_email quedó en", email);
