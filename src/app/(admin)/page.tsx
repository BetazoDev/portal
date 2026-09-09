import type { Metadata } from "next";
import Link from "next/link";

import { EstadoVacio } from "@/components/dominio/estado-vacio";
import { TarjetaKanban } from "@/components/dominio/tarjeta-kanban";
import { CabeceraPagina } from "@/components/shell/cabecera-pagina";
import { BriefDelDia } from "@/components/hoy/brief-del-dia";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hoy" };

const CAMPOS =
  "id, title, status, priority, task_type_name, task_type_color, project_name, organization_name, due_date, is_overdue, comment_count, attachment_count, sort_order";

export default async function PaginaHoy() {
  const supabase = await crearClienteServidor();

  const enOchoDias = new Date();
  enOchoDias.setDate(enOchoDias.getDate() + 8);

  const [{ data: nuevas }, { data: porVencer }] = await Promise.all([
    supabase
      .from("v_board_tasks")
      .select(CAMPOS)
      .eq("status", "nuevo")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("v_board_tasks")
      .select(CAMPOS)
      .not("status", "in", "(hecho,cancelado)")
      .not("due_date", "is", null)
      .lte("due_date", enOchoDias.toISOString().slice(0, 10))
      .order("due_date")
      .limit(12),
  ]);

  const sinNada = (nuevas?.length ?? 0) === 0 && (porVencer?.length ?? 0) === 0;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <CabeceraPagina
        titulo="Hoy"
        descripcion="Lo que entró sin revisar y lo que está por vencerse, en las dos columnas."
      />

      <BriefDelDia />

      {sinNada ? (
        <EstadoVacio
          className="mt-6"
          titulo="No hay nada urgente"
          descripcion="Ninguna tarea nueva sin revisar y ninguna a punto de vencerse. Buen momento para adelantar lo que está en progreso."
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ListaDeTareas titulo="Entradas nuevas" tareas={(nuevas ?? []) as unknown as Fila[]} />
          <ListaDeTareas titulo="Por vencer" tareas={(porVencer ?? []) as unknown as Fila[]} />
        </div>
      )}
    </main>
  );
}

type Fila = {
  id: string;
  title: string;
  priority: "baja" | "media" | "alta" | "urgente";
  task_type_name: string | null;
  task_type_color: string | null;
  project_name: string;
  organization_name: string;
  due_date: string | null;
  is_overdue: boolean;
  comment_count: number;
  attachment_count: number;
};

function ListaDeTareas({ titulo, tareas }: { titulo: string; tareas: Fila[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-title-section flex items-baseline justify-between">
        {titulo}
        <span className="text-meta text-ink-soft" data-cifras>
          {tareas.length}
        </span>
      </h2>

      {tareas.length === 0 ? (
        <p className="text-meta text-ink-soft">Nada por aquí.</p>
      ) : (
        <ul className="space-y-2">
          {tareas.map((t) => (
            <li key={t.id}>
              <Link href={`/tareas/${t.id}`} className="rounded-card block">
                <TarjetaKanban
                  datos={{
                    titulo: t.title,
                    prioridad: t.priority,
                    tipo: t.task_type_name,
                    tipoColor: t.task_type_color,
                    proyecto: `${t.organization_name} / ${t.project_name}`,
                    fecha: t.due_date,
                    vencida: t.is_overdue,
                    comentarios: t.comment_count,
                    adjuntos: t.attachment_count,
                  }}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
