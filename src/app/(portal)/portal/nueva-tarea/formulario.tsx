"use client";

import { Paperclip, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import {
  ACEPTA,
  DESCRIPCION_TIPOS,
  motivoDeRechazo,
  rutaDeAdjunto,
  tipoDeArchivo,
} from "@/lib/adjuntos";
import { crearClienteNavegador } from "@/lib/supabase/client";

import { crearTarea, registrarAdjunto } from "../acciones";

export function FormularioNuevaTarea({
  organizationId,
  proyectos,
  tipos,
}: {
  organizationId: string;
  proyectos: { id: string; nombre: string }[];
  tipos: { id: string; name: string; description: string | null; expected_days: number | null }[];
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipoElegido, setTipoElegido] = useState<string>("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const tipo = tipos.find((t) => t.id === tipoElegido);

  function elegirArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const nuevos = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite volver a elegir el mismo archivo
    setError(null);

    for (const archivo of nuevos) {
      const rechazo = motivoDeRechazo(archivo);
      if (rechazo) {
        setError(rechazo);
        return;
      }
    }

    setArchivos((previos) => [...previos, ...nuevos]);
  }

  function quitarArchivo(indice: number) {
    setArchivos((previos) => previos.filter((_, i) => i !== indice));
  }

  /**
   * Los adjuntos se suben después de crear la tarea, no antes: la ruta del
   * bucket los cuelga de un task_id que hasta ese momento no existe.
   *
   * Si alguno falla no se pierde la solicitud —la tarea ya está creada y el
   * cliente puede reintentar desde ella—, así que se avisa y se sigue.
   */
  async function subirAdjuntos(taskId: string) {
    const supabase = crearClienteNavegador();
    const fallidos: string[] = [];

    for (const [i, archivo] of archivos.entries()) {
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`);

      const ruta = rutaDeAdjunto(organizationId, taskId, archivo.name);
      const tipoArchivo = tipoDeArchivo(archivo);

      const { error: errorSubida } = await supabase.storage
        .from("task-attachments")
        .upload(ruta, archivo, { contentType: tipoArchivo });

      if (errorSubida) {
        fallidos.push(archivo.name);
        continue;
      }

      const registro = await registrarAdjunto(
        taskId,
        organizationId,
        ruta,
        archivo.name,
        tipoArchivo,
        archivo.size
      );

      if (!registro.ok) {
        await supabase.storage.from("task-attachments").remove([ruta]);
        fallidos.push(archivo.name);
      }
    }

    return fallidos;
  }

  /** Sugerencia de fecha a partir de los días estimados del tipo. */
  const fechaSugerida = tipo?.expected_days
    ? new Date(Date.now() + tipo.expected_days * 86400000).toISOString().slice(0, 10)
    : "";

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);

    iniciar(async () => {
      const resultado = await crearTarea(datos);

      if (!resultado.ok || !resultado.taskId) {
        setError(resultado.error ?? "No se pudo crear la tarea.");
        return;
      }

      const fallidos = archivos.length > 0 ? await subirAdjuntos(resultado.taskId) : [];
      setProgreso(null);

      if (fallidos.length > 0) {
        toast.error(
          `La solicitud se envió, pero no se pudo adjuntar ${fallidos.join(", ")}. Ábrela y vuelve a intentarlo.`
        );
      } else {
        toast.success("Solicitud enviada");
      }

      router.push("/portal");
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <input type="hidden" name="organization_id" value={organizationId} />

      <div className="space-y-2">
        <Label htmlFor="title">¿Qué necesitas?</Label>
        <Input
          id="title"
          name="title"
          required
          autoFocus
          placeholder="El formulario de contacto no manda correos"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Cuéntanos los detalles</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          placeholder="Dónde lo viste, qué esperabas que pasara y qué pasó. Si hay accesos o enlaces que sirvan, ponlos aquí."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project_id">Proyecto</Label>
          <Select name="project_id" required>
            <SelectTrigger id="project_id" className="w-full">
              <SelectValue placeholder="Elige el proyecto" />
            </SelectTrigger>
            <SelectContent>
              {proyectos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task_type_id">Tipo</Label>
          <Select name="task_type_id" value={tipoElegido} onValueChange={setTipoElegido}>
            <SelectTrigger id="task_type_id" className="w-full">
              <SelectValue placeholder="Elige el tipo" />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tipo?.description ? (
            <p className="text-meta text-ink-soft">{tipo.description}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">¿Para cuándo la necesitas?</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            key={fechaSugerida}
            defaultValue={fechaSugerida}
          />
          {tipo?.expected_days ? (
            <p className="text-meta text-ink-soft">
              Este tipo de trabajo suele tomar {tipo.expected_days} días.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adjuntos">Archivos</Label>

        <input
          ref={entrada}
          id="adjuntos"
          type="file"
          multiple
          accept={ACEPTA}
          onChange={elegirArchivos}
          className="sr-only"
        />

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pendiente}
            onClick={() => entrada.current?.click()}
          >
            <Paperclip strokeWidth={1.5} />
            Adjuntar archivos
          </Button>
        </div>

        {archivos.length > 0 ? (
          <ul className="rounded-card divide-y border">
            {archivos.map((archivo, i) => (
              <li key={`${archivo.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                <span className="text-meta flex-1 truncate">{archivo.name}</span>
                <span className="text-meta text-ink-soft shrink-0" data-cifras>
                  {(archivo.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pendiente}
                  aria-label={`Quitar ${archivo.name}`}
                  onClick={() => quitarArchivo(i)}
                >
                  <X strokeWidth={1.5} />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-meta text-ink-soft">
          Un pantallazo suele explicar más que un párrafo. Hasta 25 MB por archivo. Se aceptan{" "}
          {DESCRIPCION_TIPOS}.
        </p>
      </div>

      {error ? <MensajeError>{error}</MensajeError> : null}

      <Button type="submit" disabled={pendiente}>
        {pendiente ? (progreso ?? "Enviando…") : "Enviar solicitud"}
      </Button>
    </form>
  );
}
