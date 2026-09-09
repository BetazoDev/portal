"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "cn";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { TarjetaKanban } from "@/components/dominio/tarjeta-kanban";
import type { TareaDeTablero } from "@/components/tablero/tipos";
import { COLUMNAS, type Estado } from "@/lib/dominio";
import { BARRA_COLUMNA } from "@/lib/tonos";
import { calcularOrden } from "@/lib/orden";
import { crearClienteNavegador } from "@/lib/supabase/client";

const CAMPOS_VISTA =
  "id, organization_id, project_id, project_name, end_client_name, task_type_name, title, status, priority, sort_order, due_date, comment_count, attachment_count, is_overdue";

export function Tablero({
  organizationId,
  tareasIniciales,
  soloLectura = false,
  baseDetalle = "/tareas",
  onMover,
  onRenormalizar,
}: {
  organizationId: string;
  tareasIniciales: TareaDeTablero[];
  soloLectura?: boolean;
  baseDetalle?: string;
  onMover?: (id: string, estado: Estado, orden: number) => Promise<{ ok: boolean; error?: string }>;
  onRenormalizar?: (organizationId: string, estado: Estado) => Promise<unknown>;
}) {
  const [tareas, setTareas] = useState(tareasIniciales);
  const [arrastrada, setArrastrada] = useState<TareaDeTablero | null>(null);
  const [realtimeVivo, setRealtimeVivo] = useState<boolean | null>(null);
  const parametros = useSearchParams();
  const supabase = useMemo(() => crearClienteNavegador(), []);
  const tareasRef = useRef(tareas);
  tareasRef.current = tareas;

  // El servidor manda datos nuevos al navegar o al revalidar.
  useEffect(() => setTareas(tareasIniciales), [tareasIniciales]);

  const recargar = useCallback(async () => {
    const { data } = await supabase
      .from("v_board_tasks")
      .select(CAMPOS_VISTA)
      .eq("organization_id", organizationId)
      .order("sort_order");
    if (data) setTareas(data as TareaDeTablero[]);
  }, [organizationId, supabase]);

  // Realtime acotado a esta organización. Se cancela al desmontar y al cambiar
  // de cliente, o el tablero anterior seguiría recibiendo eventos ajenos.
  //
  // Si el WebSocket no levanta —pasa cuando el proxy de la instancia no deja
  // pasar el upgrade— se cae a consultar cada 20 segundos. Dos navegadores
  // abiertos se siguen sincronizando, solo que con retraso, en vez de quedarse
  // congelados sin avisar.
  useEffect(() => {
    let sondeo: ReturnType<typeof setInterval> | null = null;

    const detenerSondeo = () => {
      if (sondeo) clearInterval(sondeo);
      sondeo = null;
    };

    const canal = supabase
      .channel(`tablero-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => void recargar()
      )
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") {
          detenerSondeo();
          setRealtimeVivo(true);
          return;
        }
        if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT" || estado === "CLOSED") {
          setRealtimeVivo(false);
          if (!sondeo) sondeo = setInterval(() => void recargar(), 20000);
        }
      });

    return () => {
      detenerSondeo();
      void supabase.removeChannel(canal);
    };
  }, [organizationId, recargar, supabase]);

  // ------------------------------------------------------------------ filtros
  const visibles = useMemo(() => {
    const proyecto = parametros.get("proyecto");
    const tipo = parametros.get("tipo");
    const prioridad = parametros.get("prioridad");
    const soloVencidas = parametros.get("vencidas") === "1";
    const texto = (parametros.get("texto") ?? "").trim().toLowerCase();

    return tareas.filter((t) => {
      if (proyecto && t.project_id !== proyecto) return false;
      if (tipo && t.task_type_name !== tipo) return false;
      if (prioridad && t.priority !== prioridad) return false;
      if (soloVencidas && !t.is_overdue) return false;
      if (texto && !t.title.toLowerCase().includes(texto)) return false;
      return true;
    });
  }, [parametros, tareas]);

  const porColumna = useMemo(() => {
    const mapa = new Map<Estado, TareaDeTablero[]>();
    for (const c of COLUMNAS) mapa.set(c.estado, []);
    for (const t of visibles) mapa.get(t.status)?.push(t);
    for (const lista of mapa.values()) lista.sort((a, b) => a.sort_order - b.sort_order);
    return mapa;
  }, [visibles]);

  const hayFiltroDeProyecto = !!parametros.get("proyecto");

  // ------------------------------------------------------------------- soltar
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function alEmpezar(evento: DragStartEvent) {
    setArrastrada(tareas.find((t) => t.id === evento.active.id) ?? null);
  }

  async function alSoltar(evento: DragEndEvent) {
    setArrastrada(null);
    const { active, over } = evento;
    if (!over || !onMover) return;

    const tarea = tareas.find((t) => t.id === active.id);
    if (!tarea) return;

    const columnaDestino = (
      COLUMNAS.some((c) => c.estado === over.id)
        ? over.id
        : (tareas.find((t) => t.id === over.id)?.status ?? tarea.status)
    ) as Estado;

    const enDestino = (porColumna.get(columnaDestino) ?? []).filter((t) => t.id !== tarea.id);
    const indiceSobre = enDestino.findIndex((t) => t.id === over.id);
    const indice = indiceSobre === -1 ? enDestino.length : indiceSobre;

    const { orden, apretado } = calcularOrden(
      enDestino[indice - 1]?.sort_order,
      enDestino[indice]?.sort_order
    );

    if (columnaDestino === tarea.status && orden === tarea.sort_order) return;

    // Actualización optimista: la tarjeta se queda donde la soltaste.
    const anteriores = tareasRef.current;
    setTareas((previas) =>
      previas.map((t) => (t.id === tarea.id ? { ...t, status: columnaDestino, sort_order: orden } : t))
    );

    const resultado = await onMover(tarea.id, columnaDestino, orden);

    if (!resultado.ok) {
      setTareas(anteriores);
      toast.error("No se pudo mover la tarea", {
        description: `${resultado.error ?? "El servidor la rechazó."} La regresamos a su lugar.`,
      });
      return;
    }

    // Si las vecinas quedaron demasiado juntas, la columna se reparte de nuevo
    // en segundo plano. El usuario no espera por esto.
    if (apretado && onRenormalizar) void onRenormalizar(organizationId, columnaDestino);
  }

  const contenido = (
    <div className="flex h-full flex-col">
      {realtimeVivo === false && (
        <p className="text-meta text-ink-soft shrink-0 px-6 pb-2">
          La actualización en vivo no está disponible. El tablero se refresca cada 20 segundos.
        </p>
      )}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-6 pb-6">
      {COLUMNAS.map((columna) => (
        <Columna
          key={columna.estado}
          estado={columna.estado}
          etiqueta={columna.etiqueta}
          tareas={porColumna.get(columna.estado) ?? []}
          soloLectura={soloLectura}
          ocultarProyecto={hayFiltroDeProyecto}
          baseDetalle={baseDetalle}
        />
      ))}
      </div>
    </div>
  );

  if (soloLectura) return contenido;

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCorners}
      onDragStart={alEmpezar}
      onDragEnd={alSoltar}
      onDragCancel={() => setArrastrada(null)}
    >
      {contenido}
      <DragOverlay>
        {arrastrada ? (
          <TarjetaKanban
            arrastrando
            datos={{
              titulo: arrastrada.title,
              prioridad: arrastrada.priority,
              tipo: arrastrada.task_type_name,
              proyecto: hayFiltroDeProyecto ? null : arrastrada.project_name,
              fecha: arrastrada.due_date,
              vencida: arrastrada.is_overdue,
              comentarios: arrastrada.comment_count,
              adjuntos: arrastrada.attachment_count,
            }}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Columna({
  estado,
  etiqueta,
  tareas,
  soloLectura,
  ocultarProyecto,
  baseDetalle,
}: {
  estado: Estado;
  etiqueta: string;
  tareas: TareaDeTablero[];
  soloLectura: boolean;
  ocultarProyecto: boolean;
  baseDetalle: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado, disabled: soloLectura });

  return (
    <section
      ref={setNodeRef}
      aria-label={etiqueta}
      className={cn(
        "bg-surface-sunken rounded-card flex w-72 shrink-0 flex-col overflow-hidden border",
        "duration-(--duracion-rapida) ease-(--curva) transition-colors",
        isOver ? "border-border-strong" : "border-border"
      )}
    >
      {/* Dos píxeles de tono. Suficiente para saltar de una columna a otra sin
          leer el encabezado, y poco para no competir con las tarjetas. */}
      <div className={cn("h-0.5 shrink-0", BARRA_COLUMNA[estado])} aria-hidden />

      <header className="text-label text-ink-soft flex shrink-0 items-center justify-between px-3 py-2.5">
        <span className="text-ink">{etiqueta}</span>
        <span data-cifras>{tareas.length}</span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext
          items={tareas.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          disabled={soloLectura}
        >
          {tareas.map((tarea) => (
            <TarjetaOrdenable
              key={tarea.id}
              tarea={tarea}
              soloLectura={soloLectura}
              ocultarProyecto={ocultarProyecto}
              baseDetalle={baseDetalle}
            />
          ))}
        </SortableContext>

        {tareas.length === 0 && (
          <p className="text-meta text-ink-faint px-1 py-3">
            {estado === "nuevo" ? "Aquí cae lo que manda el cliente." : "Nada por ahora."}
          </p>
        )}
      </div>
    </section>
  );
}

function TarjetaOrdenable({
  tarea,
  soloLectura,
  ocultarProyecto,
  baseDetalle,
}: {
  tarea: TareaDeTablero;
  soloLectura: boolean;
  ocultarProyecto: boolean;
  baseDetalle: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarea.id,
    disabled: soloLectura,
  });

  const datos = {
    titulo: tarea.title,
    prioridad: tarea.priority,
    tipo: tarea.task_type_name,
    proyecto: ocultarProyecto ? null : tarea.project_name,
    fecha: tarea.due_date,
    vencida: tarea.is_overdue,
    comentarios: tarea.comment_count,
    adjuntos: tarea.attachment_count,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(soloLectura ? {} : attributes)}
      {...(soloLectura ? {} : listeners)}
      // El hueco de origen queda como marco punteado, sin contenido.
      className={cn(isDragging && "border-border-strong rounded-card h-24 border border-dashed")}
    >
      {!isDragging && (
        <Link href={`${baseDetalle}/${tarea.id}`} className="rounded-card block">
          <TarjetaKanban datos={datos} arrastrable={!soloLectura} />
        </Link>
      )}
    </div>
  );
}
