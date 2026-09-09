// Monta un usuario de cliente para la prueba 9 (rutas de admin -> 404).
// Uso: node --env-file=.env.local <este archivo> crear | limpiar

import { createClient } from "@supabase/supabase-js";

const accion = process.argv[2] ?? "crear";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const EMAIL = "prueba-rutas@example.com";
const PASSWORD = "Prueba-Rutas-2026!";
const SLUG = "prueba-rutas-org";

async function limpiar() {
  await admin.from("organizations").delete().eq("slug", SLUG);
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email === EMAIL) await admin.auth.admin.deleteUser(u.id);
  }
  console.log("limpio");
}

if (accion === "limpiar") {
  await limpiar();
  process.exit(0);
}

await limpiar();

const { data: usuario, error: e1 } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
});
if (e1) throw e1;

// Con contraseña temporal pendiente, para probar también el forzado.
await admin
  .from("profiles")
  .update({ must_change_password: true, full_name: "Agencia de prueba" })
  .eq("id", usuario.user.id);

const { data: org, error: e2 } = await admin
  .from("organizations")
  .insert({ name: "Agencia de prueba", slug: SLUG })
  .select("id")
  .single();
if (e2) throw e2;

await admin
  .from("memberships")
  .insert({ profile_id: usuario.user.id, organization_id: org.id, role: "client_owner" });

console.log("usuario:", EMAIL);
console.log("clave  :", PASSWORD);
console.log("org    :", org.id);
