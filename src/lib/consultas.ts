import "server-only";

import { crearClienteServidor } from "@/lib/supabase/server";

/** El perfil de quien tiene la sesión abierta. */
export async function perfilActual() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, must_change_password, last_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  if (data) void marcarVisto(supabase, data.id, data.last_seen_at);

  return data;
}

/**
 * Deja constancia de la última vez que alguien entró, para saber si un cliente
 * al que diste de alta de verdad está usando el portal.
 *
 * Se escribe cuando mucho una vez por hora: el layout corre en cada
 * navegación y no vale la pena un UPDATE por clic. No se espera el resultado
 * porque nada de la pantalla depende de él.
 */
async function marcarVisto(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  id: string,
  ultimaVez: string | null
) {
  const UNA_HORA = 3600_000;
  if (ultimaVez && Date.now() - new Date(ultimaVez).getTime() < UNA_HORA) return;

  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", id);
}

export type ClienteConProyectos = {
  id: string;
  name: string;
  slug: string;
  proyectos: { id: string; name: string; end_client_name: string }[];
};

/**
 * El árbol que pinta el sidebar: cada organización con sus proyectos.
 * RLS decide qué se ve, así que la misma consulta sirve para el dueño y para
 * el portal del cliente.
 */
export async function arbolDeClientes(): Promise<ClienteConProyectos[]> {
  const supabase = await crearClienteServidor();

  const [{ data: organizaciones }, { data: proyectos }] = await Promise.all([
    supabase.from("organizations").select("id, name, slug").order("name"),
    supabase
      .from("projects")
      .select("id, name, organization_id, end_clients(name)")
      .neq("status", "archivado")
      .order("name"),
  ]);

  const porOrganizacion = new Map<string, ClienteConProyectos["proyectos"]>();
  for (const p of proyectos ?? []) {
    const lista = porOrganizacion.get(p.organization_id) ?? [];
    lista.push({
      id: p.id,
      name: p.name,
      end_client_name: p.end_clients?.name ?? "",
    });
    porOrganizacion.set(p.organization_id, lista);
  }

  return (organizaciones ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    proyectos: porOrganizacion.get(o.id) ?? [],
  }));
}

/**
 * La organización del usuario que tiene la sesión. El portal es de un solo
 * cliente, así que si hay más de una membresía se usa la primera por nombre.
 */
export async function miOrganizacion() {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name")
    .limit(1)
    .maybeSingle();

  return data;
}
