"use client";

import { Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { MensajeError } from "@/components/dominio/mensaje-error";
import { Button } from "@/components/ui/button";
import { crearClienteNavegador } from "@/lib/supabase/client";

/** 25 MB. Arriba de eso conviene un enlace a Drive, no un adjunto. */
const LIMITE_BYTES = 25 * 1024 * 1024;

/** Deja el nombre en algo que sobreviva a una URL y a un sistema de archivos. */
function nombreSeguro(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/**
 * Sube al bucket privado desde el navegador, con la sesión del usuario. RLS
 * sobre storage.objects solo deja escribir dentro de la carpeta de su propia
 * organización, así que la ruta no es una convención: es el candado.
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

    if (archivo.size > LIMITE_BYTES) {
      setError(
        `${archivo.name} pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el límite son 25 MB. Súbelo a otro lado y pega el enlace en un comentario.`
      );
      e.target.value = "";
      return;
    }

    setSubiendo(true);

    // Convención de ruta: {organization_id}/{task_id}/{archivo}. El prefijo de
    // tiempo evita que dos archivos con el mismo nombre se pisen.
    const ruta = `${organizationId}/${taskId}/${Date.now()}-${nombreSeguro(archivo.name)}`;
    const supabase = crearClienteNavegador();

    const { error: errorSubida } = await supabase.storage
      .from("task-attachments")
      .upload(ruta, archivo, { contentType: archivo.type || undefined });

    if (errorSubida) {
      setSubiendo(false);
      e.target.value = "";
      setError("No se pudo subir el archivo. Vuelve a intentarlo.");
      return;
    }

    const resultado = await onRegistrar(
      taskId,
      organizationId,
      ruta,
      archivo.name,
      archivo.type || "application/octet-stream",
      archivo.size
    );

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

      {error ? <MensajeError>{error}</MensajeError> : null}
    </div>
  );
}
