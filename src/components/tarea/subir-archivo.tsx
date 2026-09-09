"use client";

import { Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { MensajeError } from "@/components/dominio/mensaje-error";
import { Button } from "@/components/ui/button";
import {
  ACEPTA,
  DESCRIPCION_TIPOS,
  motivoDeRechazo,
  rutaDeAdjunto,
  tipoDeArchivo,
} from "@/lib/adjuntos";
import { crearClienteNavegador } from "@/lib/supabase/client";

/**
 * Sube al bucket privado desde el navegador, con la sesión del usuario. RLS
 * sobre storage.objects solo deja escribir dentro de la carpeta de su propia
 * organización, así que la ruta no es una convención: es el candado.
 *
 * El tamaño y el tipo se revisan aquí por cortesía —avisar antes de subir
 * 20 MB para nada— pero el control real está en el bucket desde la migración
 * 007, donde no se puede esquivar llamando a la API directamente.
 */
export function SubirArchivo({
  taskId,
  organizationId,
  onRegistrar,
}: {
  taskId: string;
  organizationId: string;
  onRegistrar: (
    taskId: string,
    organizationId: string,
    rutaStorage: string,
    nombre: string,
    tipo: string,
    bytes: number
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError(null);

    const rechazo = motivoDeRechazo(archivo);
    if (rechazo) {
      setError(rechazo);
      e.target.value = "";
      return;
    }

    setSubiendo(true);

    const ruta = rutaDeAdjunto(organizationId, taskId, archivo.name);
    const tipo = tipoDeArchivo(archivo);
    const supabase = crearClienteNavegador();

    const { error: errorSubida } = await supabase.storage
      .from("task-attachments")
      .upload(ruta, archivo, { contentType: tipo });

    if (errorSubida) {
      setSubiendo(false);
      e.target.value = "";
      setError("No se pudo subir el archivo. Vuelve a intentarlo.");
      return;
    }

    const resultado = await onRegistrar(taskId, organizationId, ruta, archivo.name, tipo, archivo.size);

    setSubiendo(false);
    e.target.value = "";

    if (!resultado.ok) {
      // El archivo quedó en el bucket pero sin fila que lo liste: se retira
      // para no dejar basura invisible.
      await supabase.storage.from("task-attachments").remove([ruta]);
      setError(resultado.error ?? "No se pudo registrar el archivo.");
      return;
    }

    router.refresh();
    toast.success(`${archivo.name} quedó adjunto`);
  }

  return (
    <div className="space-y-2">
      <input
        ref={entrada}
        type="file"
        accept={ACEPTA}
        onChange={alElegir}
        className="sr-only"
        aria-label="Elegir un archivo para adjuntar"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={subiendo}
        onClick={() => entrada.current?.click()}
      >
        <Paperclip strokeWidth={1.5} />
        {subiendo ? "Subiendo…" : "Adjuntar archivo"}
      </Button>

      <p className="text-meta text-ink-soft">Hasta 25 MB. Se aceptan {DESCRIPCION_TIPOS}.</p>

      {error ? <MensajeError>{error}</MensajeError> : null}
    </div>
  );
}
