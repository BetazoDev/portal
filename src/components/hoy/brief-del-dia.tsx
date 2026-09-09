import { Sparkles } from "lucide-react";
import Link from "next/link";

import { MarkdownSimple } from "@/components/markdown-simple";
import { crearClienteServidor } from "@/lib/supabase/server";

import { BotonGenerarBrief } from "./boton-generar";

/**
 * El brief es un extra, nunca un bloqueo: si no hay LLM configurado o la
 * llamada falló, esta pantalla sigue mostrando las tareas y aquí no aparece
 * nada más que la invitación a configurarlo.
 */
export async function BriefDelDia() {
  const supabase = await crearClienteServidor();

  const [{ data: brief }, { data: ajustes }] = await Promise.all([
    supabase
      .from("daily_briefs")
      .select("output_md, model, created_at")
      .eq("brief_date", new Date().toISOString().slice(0, 10))
      .maybeSingle(),
    supabase.rpc("get_llm_settings"),
  ]);

  // Una pasarela propia no guarda llave, así que basta con que haya un
  // proveedor activo. Si algo falla, la ruta del brief lo dice con detalle.
  const configurado = (ajustes ?? []).some((a) => a.is_active);

  if (!configurado) {
    return (
      <section className="border-border rounded-card border border-dashed p-4">
        <p className="text-meta text-ink-soft">
          Todavía no hay un modelo configurado, así que no hay resumen del día.{" "}
          <Link href="/configuracion/llm" className="text-ink underline underline-offset-4">
            Configúralo
          </Link>{" "}
          para que cada mañana te diga qué atender primero.
        </p>
      </section>
    );
  }

  return (
    <section className="border-border rounded-card border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-title-section flex items-center gap-2">
          <Sparkles className="text-ink-soft size-4" strokeWidth={1.5} aria-hidden />
          Resumen del día
        </h2>
        <BotonGenerarBrief hayBrief={!!brief?.output_md} />
      </div>

      {brief?.output_md ? (
        <MarkdownSimple texto={brief.output_md} />
      ) : (
        <p className="text-meta text-ink-soft">
          El resumen de hoy todavía no se ha generado. Genéralo ahora o espera al horario que
          dejaste configurado.
        </p>
      )}
    </section>
  );
}
