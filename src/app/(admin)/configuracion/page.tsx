import type { Metadata } from "next";

import { perfilActual } from "@/lib/consultas";
import { crearClienteAdmin } from "@/lib/supabase/admin";

import { FormularioGeneral } from "./formulario";

export const metadata: Metadata = { title: "Configuración" };

export default async function PaginaConfiguracion() {
  const perfil = await perfilActual();

  // app_config no es legible con la sesión del usuario ni siquiera para el
  // dueño: la lee el servidor con service_role para poder mostrarla aquí.
  const admin = crearClienteAdmin();
  const { data: filas } = await admin.from("app_config").select("key, value");
  const config = Object.fromEntries((filas ?? []).map((f) => [f.key, f.value]));

  return (
    <main className="max-w-2xl p-6">
      <FormularioGeneral
        nombre={perfil?.full_name ?? ""}
        correo={perfil?.email ?? ""}
        webhookUrl={config.n8n_webhook_url ?? ""}
        secreto={config.n8n_webhook_secret ?? ""}
        appBaseUrl={config.app_base_url ?? ""}
        adminEmail={config.admin_email ?? ""}
      />
    </main>
  );
}
