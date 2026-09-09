import { notFound } from "next/navigation";

import { SubNavegacion } from "@/components/shell/sub-navegacion";
import { crearClienteServidor } from "@/lib/supabase/server";

export default async function LayoutCliente({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await crearClienteServidor();

  const { data: organizacion } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();

  if (!organizacion) notFound();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border shrink-0 border-b px-6 pt-5">
        <h1 className="text-title-page mb-3">{organizacion.name}</h1>
        <SubNavegacion
          base={`/clientes/${organizacion.id}`}
          apartados={[
            { href: "", etiqueta: "Tablero" },
            { href: "/clientes-finales", etiqueta: "Clientes finales" },
            { href: "/proyectos", etiqueta: "Proyectos" },
            { href: "/tipos-de-tarea", etiqueta: "Tipos de tarea" },
            { href: "/ajustes", etiqueta: "Ajustes" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
