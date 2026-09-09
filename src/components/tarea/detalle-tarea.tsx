"use client";

import { Download, Paperclip, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { BadgeEstado } from "@/components/dominio/badge-estado";
import { ChipPrioridad } from "@/components/dominio/chip-prioridad";
import { MensajeError } from "@/components/dominio/mensaje-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubirArchivo } from "@/components/tarea/subir-archivo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { describirEvento } from "@/lib/actividad";
import { COLUMNAS, ETIQUETA_ESTADO, PRIORIDADES, formatearFecha, type Estado, type Prioridad } from "@/lib/dominio";

export type TareaDetallada = {
  id: string;
  title: string;
  description: string | null;
  status: Estado;
  priority: Prioridad;
  due_date: string | null;
  task_type_id: string | null;
  project_id: string;
  organization_id: string;
  project_name: string;
  end_client_name: string;
  organization_name: string;
};

export type Evento = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type Comentario = {
  id: string;
  body: string;
  created_at: string;
  autor: string;
};

export type Adjunto = {
  id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
};

export function DetalleTarea({
  tarea,
  proyectos,
  tipos,
  eventos,
  comentarios,
  adjuntos,
  soloLectura = false,
  panelLateral,
  onActualizar,
  onComentar,
  onDescargar,
  onAdjuntar,
}: {
  tarea: TareaDetallada;
  proyectos: { id: string; name: string }[];
  tipos: { id: string; name: string }[];
  eventos: Evento[];
  comentarios: Comentario[];
  adjuntos: Adjunto[];
  soloLectura?: boolean;
  panelLateral?: React.ReactNode;
  onActualizar: (cambios: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  onComentar: (taskId: string, cuerpo: string) => Promise<{ ok: boolean; error?: string }>;
  onDescargar: (ruta: string) => Promise<{ url?: string; error?: string }>;
  onAdjuntar?: (
    taskId: string,
    organizationId: string,
    rutaStorage: string,
    nombre: string,
    tipo: string,
    bytes: number
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(tarea.title);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function cambiar(campos: Record<string, unknown>) {
    setError(null);
    iniciar(async () => {
      const resultado = await onActualizar({ id: tarea.id, ...campos });
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo guardar el cambio.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-4">
          <p className="text-meta text-ink-soft">
            {tarea.organization_name}
            <span className="mx-2">/</span>
            {tarea.end_client_name}
            <span className="mx-2">/</span>
            {tarea.project_name}
          </p>

          {soloLectura ? (
            <h1 className="text-title-page">{tarea.title}</h1>
          ) : (
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => titulo !== tarea.title && cambiar({ title: titulo })}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-label="Título de la tarea"
              className="text-title-page focus-visible:border-border-strong -mx-2 w-full rounded-md border border-transparent px-2 py-1 outline-none"
            />
          )}

          {soloLectura ? (
            <div className="flex flex-wrap items-center gap-2">
              <BadgeEstado estado={tarea.status} />
              <ChipPrioridad prioridad={tarea.priority} />
              {tarea.due_date ? (
                <span className="text-meta text-ink-soft">
                  Entrega el {formatearFecha(tarea.due_date)}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Estado">
                <Select value={tarea.status} onValueChange={(v) => cambiar({ status: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNAS.map((c) => (
                      <SelectItem key={c.estado} value={c.estado}>
                        {c.etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo etiqueta="Prioridad">
                <Select value={tarea.priority} onValueChange={(v) => cambiar({ priority: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.prioridad} value={p.prioridad}>
                        {p.etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo etiqueta="Tipo">
                <Select
                  value={tarea.task_type_id ?? "sin-tipo"}
                  onValueChange={(v) => cambiar({ task_type_id: v === "sin-tipo" ? null : v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin-tipo">Sin tipo</SelectItem>
                    {tipos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo etiqueta="Entrega">
                <Input
                  type="date"
                  defaultValue={tarea.due_date ?? ""}
                  onChange={(e) => cambiar({ due_date: e.target.value || null })}
                />
              </Campo>

              <div className="sm:col-span-2 lg:col-span-4">
                <Campo etiqueta="Proyecto">
                  <Select value={tarea.project_id} onValueChange={(v) => cambiar({ project_id: v })}>
                    <SelectTrigger className="w-full sm:max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {proyectos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
              </div>
            </div>
          )}

          {error ? <MensajeError>{error}</MensajeError> : null}
        </header>

        {tarea.description ? (
          <p className="text-body text-ink whitespace-pre-wrap">{tarea.description}</p>
        ) : null}

        <Tabs defaultValue="actividad">
          <TabsList>
            <TabsTrigger value="actividad">Actividad</TabsTrigger>
            <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
            <TabsTrigger value="archivos">Archivos</TabsTrigger>
          </TabsList>

          <TabsContent value="actividad" className="pt-4">
            {eventos.length === 0 ? (
              <p className="text-meta text-ink-soft">Todavía no ha pasado nada con esta tarea.</p>
            ) : (
              <ol className="space-y-3">
                {eventos.map((e) => (
                  <li key={e.id} className="text-body flex flex-wrap items-baseline gap-x-2">
                    <span>{describirEvento(e.event_type, e.payload)}</span>
                    <time className="text-meta text-ink-soft" dateTime={e.created_at}>
                      {formatearFecha(e.created_at)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-4 pt-4">
            <FormularioComentario taskId={tarea.id} onComentar={onComentar} />

            {comentarios.length === 0 ? (
              <p className="text-meta text-ink-soft">
                Nadie ha comentado. Empieza tú si hace falta aclarar algo.
              </p>
            ) : (
              <ul className="space-y-4">
                {comentarios.map((c) => (
                  <li key={c.id} className="border-border rounded-card border p-3">
                    <div className="text-meta text-ink-soft mb-1 flex items-baseline justify-between gap-2">
                      <span className="text-ink font-medium">{c.autor}</span>
                      <time dateTime={c.created_at}>{formatearFecha(c.created_at)}</time>
                    </div>
                    <p className="text-body whitespace-pre-wrap">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="archivos" className="space-y-4 pt-4">
            {onAdjuntar ? (
              <SubirArchivo
                taskId={tarea.id}
                organizationId={tarea.organization_id}
                onRegistrar={onAdjuntar}
              />
            ) : null}

            {adjuntos.length === 0 ? (
              <p className="text-meta text-ink-soft">
                No hay archivos en esta tarea. Los que subas se guardan en privado y se descargan
                con un enlace temporal.
              </p>
            ) : (
              <ul className="border-border rounded-card divide-border divide-y border">
                {adjuntos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="text-ink-soft size-4 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{a.file_name}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const { url, error } = await onDescargar(a.storage_path);
                        if (url) window.open(url, "_blank", "noopener");
                        else toast.error(error ?? "No se pudo descargar.");
                      }}
                    >
                      <Download strokeWidth={1.5} /> Descargar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {panelLateral ? <div className="lg:sticky lg:top-4 lg:self-start">{panelLateral}</div> : null}

      {pendiente ? <span className="sr-only">Guardando cambios</span> : null}
      <span className="sr-only" aria-live="polite">
        Estado actual: {ETIQUETA_ESTADO[tarea.status]}
      </span>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-label text-ink-soft">{etiqueta}</Label>
      {children}
    </div>
  );
}

function FormularioComentario({
  taskId,
  onComentar,
}: {
  taskId: string;
  onComentar: (taskId: string, cuerpo: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [pendiente, iniciar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;

    iniciar(async () => {
      const resultado = await onComentar(taskId, texto);
      if (!resultado.ok) {
        toast.error(resultado.error ?? "No se pudo publicar.");
        return;
      }
      setTexto("");
      router.refresh();
      toast.success("Comentario publicado");
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Escribe un comentario. Le llega por correo a la otra parte."
        aria-label="Nuevo comentario"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pendiente || !texto.trim()}>
          <Send strokeWidth={1.5} />
          {pendiente ? "Publicando…" : "Publicar comentario"}
        </Button>
      </div>
    </form>
  );
}
