"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { MensajeError } from "@/components/dominio/mensaje-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ConteoOrganizacion } from "./[orgId]/acciones";

/**
 * Las acciones de cada agencia, en la lista.
 *
 * Antes editar solo se alcanzaba entrando a la agencia y encontrando la última
 * pestaña, que nadie encuentra. Archivar es lo normal y es reversible; borrar
 * está detrás de una confirmación escrita porque se lleva el historial entero.
 */
export function AccionesDeFila({
  id,
  nombre,
  status,
  alCambiarEstado,
  alContar,
}: {
  id: string;
  nombre: string;
  status: string;
  alCambiarEstado: (
    id: string,
    status: "activo" | "pausado" | "archivado"
  ) => Promise<{ ok: boolean; error?: string }>;
  alContar: (id: string) => Promise<ConteoOrganizacion>;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [conteo, setConteo] = useState<ConteoOrganizacion | null>(null);
  const [escrito, setEscrito] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  const archivada = status === "archivado";

  function cambiarEstado(nuevo: "activo" | "archivado") {
    empezar(async () => {
      const r = await alCambiarEstado(id, nuevo);
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo cambiar el estado");
        return;
      }
      toast.success(
        nuevo === "archivado"
          ? `${nombre} quedó archivada. Su equipo ya no puede entrar al portal.`
          : `${nombre} vuelve a estar activa.`
      );
      router.refresh();
    });
  }

  async function abrirBorrado() {
    setEscrito("");
    setError(null);
    setConteo(null);
    setDialogoAbierto(true);
    // El conteo se pide al abrir, no al pintar la tabla: son seis consultas
    // por agencia y no tiene sentido pagarlas por una acción que casi nunca
    // se usa.
    setConteo(await alContar(id));
  }

  async function borrar() {
    setBorrando(true);
    setError(null);

    const respuesta = await fetch(`/api/clientes/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmacion: escrito }),
    });

    const datos = await respuesta.json().catch(() => ({}));
    setBorrando(false);

    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo borrar.");
      return;
    }

    setDialogoAbierto(false);
    toast.success(`${datos.nombre} se borró por completo.`);
    router.refresh();
  }

  const total = conteo
    ? conteo.tareas + conteo.comentarios + conteo.adjuntos + conteo.proyectos + conteo.clientesFinales
    : 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Acciones de ${nombre}`}>
            <MoreHorizontal strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/clientes/${id}/ajustes`}>
              <Pencil strokeWidth={1.5} />
              Editar
            </Link>
          </DropdownMenuItem>

          {archivada ? (
            <DropdownMenuItem onSelect={() => cambiarEstado("activo")} disabled={pendiente}>
              <ArchiveRestore strokeWidth={1.5} />
              Reactivar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => cambiarEstado("archivado")} disabled={pendiente}>
              <Archive strokeWidth={1.5} />
              Archivar
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onSelect={() => void abrirBorrado()}>
            <Trash2 strokeWidth={1.5} />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {nombre}</DialogTitle>
            <DialogDescription>
              Esto no se puede deshacer. Si solo quieres dar de baja al cliente, archívalo: conserva
              el historial y se puede revertir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {conteo === null ? (
              <p className="text-meta text-ink-soft">Contando lo que se perdería…</p>
            ) : total === 0 && conteo.miembros === 0 ? (
              <p className="text-meta text-ink-soft">
                Esta agencia está vacía. No hay nada que perder.
              </p>
            ) : (
              <div className="rounded-card border border-linea p-4">
                <p className="text-meta text-ink-soft mb-3">Se borra para siempre:</p>
                <ul className="text-meta grid grid-cols-2 gap-x-6 gap-y-1">
                  <Renglon n={conteo.tareas} singular="tarea" plural="tareas" />
                  <Renglon n={conteo.comentarios} singular="comentario" plural="comentarios" />
                  <Renglon n={conteo.adjuntos} singular="adjunto" plural="adjuntos" />
                  <Renglon n={conteo.proyectos} singular="proyecto" plural="proyectos" />
                  <Renglon n={conteo.clientesFinales} singular="cliente final" plural="clientes finales" />
                  <Renglon n={conteo.miembros} singular="acceso" plural="accesos" />
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmacion">
                Escribe <span className="font-medium">{nombre}</span> para confirmar
              </Label>
              <Input
                id="confirmacion"
                value={escrito}
                onChange={(e) => setEscrito(e.target.value)}
                autoComplete="off"
              />
            </div>

            {error ? <MensajeError>{error}</MensajeError> : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={borrar}
              disabled={borrando || escrito.trim() !== nombre.trim()}
            >
              <Trash2 strokeWidth={1.5} />
              {borrando ? "Eliminando…" : "Eliminar para siempre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Renglon({ n, singular, plural }: { n: number; singular: string; plural: string }) {
  return (
    <li className="flex items-baseline gap-2">
      <span data-cifras className="font-medium">
        {n}
      </span>
      <span className="text-ink-soft">{n === 1 ? singular : plural}</span>
    </li>
  );
}
