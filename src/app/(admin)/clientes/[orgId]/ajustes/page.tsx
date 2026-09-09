import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/server";

import { FormularioAjustes } from "./formulario";

export const metadata: Metadata = { title: "Ajustes del cliente" };

export default async function PaginaAjustes({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: organizacion }, { data: miembros }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, contact_email, contact_phone, status, notes")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("id, role, profiles(email, full_name, last_seen_at, must_change_password)")
      .eq("organization_id", orgId),
  ]);

  if (!organizacion) notFound();

  return (
    <main className="max-w-2xl p-6">
      <FormularioAjustes organizacion={organizacion} />

      <section className="mt-8 space-y-3">
        <h2 className="text-title-section">Quién tiene acceso</h2>
        <ul className="border-border rounded-card divide-border divide-y border">
          {(miembros ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-body truncate">{m.profiles?.full_name ?? m.profiles?.email}</p>
                <p className="text-meta text-ink-soft truncate">{m.profiles?.email}</p>
              </div>
              <p className="text-meta text-ink-soft shrink-0">
                {m.profiles?.must_change_password
                  ? "Todavía no cambia su contraseña"
                  : m.role === "client_owner"
                    ? "Dueño de la agencia"
                    : "Miembro"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
