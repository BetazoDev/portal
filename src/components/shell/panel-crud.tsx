"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EstadoVacio } from "@/components/dominio/estado-vacio";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type Campo = {
  name: string;
  etiqueta: string;
  tipo?: "texto" | "correo" | "telefono" | "url" | "fecha" | "numero" | "area" | "select" | "switch";
  requerido?: boolean;
  placeholder?: string;
  ayuda?: string;
  opciones?: { valor: string; etiqueta: string }[];
  medio?: boolean;
};

export type Fila = {
  id: string;
  celdas: string[];
  /** Valores crudos para volver a llenar el formulario al editar. */
  datos: Record<string, string>;
};

type Resultado = { ok: boolean; error?: string };

/**
 * Tabla con alta, edición y borrado. La usan clientes finales, proyectos y
 * tipos de tarea del lado del dueño, y las mismas pantallas del portal.
 *
 * Toda escritura pasa por una Server Action y por lo tanto por RLS: si al
 * cliente no le corresponde tocar una fila, la base lo rechaza aunque la UI
 * se lo hubiera permitido.
 */
export function PanelCrud({
  columnas,
  filas,
  campos,
  ocultos,
  textoAlta,
  tituloFormulario,
  descripcionFormulario,
  vacio,
  accionGuardar,
  accionBorrar,
  contextoBorrado,
  soloLectura = false,
}: {
  columnas: { etiqueta: string; derecha?: boolean }[];
  filas: Fila[];
  campos: Campo[];
  ocultos: Record<string, string>;
  textoAlta: string;
  tituloFormulario: string;
  descripcionFormulario: string;
  vacio: { titulo: string; descripcion: string };
  accionGuardar: (datos: FormData) => Promise<Resultado>;
  accionBorrar?: (id: string, contexto: string) => Promise<Resultado>;
  contextoBorrado: string;
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Fila | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [porBorrar, setPorBorrar] = useState<Fila | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function abrirAlta() {
    setEditando(null);
    setError(null);
    setAbierto(true);
  }

  function abrirEdicion(fila: Fila) {
    setEditando(fila);
    setError(null);
    setAbierto(true);
  }

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);

    iniciar(async () => {
      const resultado = await accionGuardar(datos);
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo guardar.");
        return;
      }
      setAbierto(false);
      router.refresh();
      toast.success(editando ? "Cambios guardados" : "Se agregó a la lista");
    });
  }

  function borrar() {
    if (!porBorrar || !accionBorrar) return;
    const fila = porBorrar;

    iniciar(async () => {
      const resultado = await accionBorrar(fila.id, contextoBorrado);
      setPorBorrar(null);
      if (!resultado.ok) {
        toast.error("No se pudo borrar", { description: resultado.error });
        return;
      }
      router.refresh();
      toast.success("Se borró de la lista");
    });
  }

  return (
    <>
      {!soloLectura && (
        <div className="mb-4 flex justify-end">
          <Button onClick={abrirAlta}>
            <Plus /> {textoAlta}
          </Button>
        </div>
      )}

      {filas.length === 0 ? (
        <EstadoVacio
          titulo={vacio.titulo}
          descripcion={vacio.descripcion}
          accion={
            soloLectura ? undefined : (
              <Button size="sm" onClick={abrirAlta}>
                <Plus /> {textoAlta}
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columnas.map((c) => (
                <TableHead key={c.etiqueta} className={c.derecha ? "text-right" : undefined}>
                  {c.etiqueta}
                </TableHead>
              ))}
              {!soloLectura && <TableHead className="w-20 text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => (
              <TableRow key={fila.id}>
                {fila.celdas.map((celda, i) => (
                  <TableCell
                    key={i}
                    className={cnCelda(i, columnas)}
                  >
                    {celda || "—"}
                  </TableCell>
                ))}
                {!soloLectura && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${fila.celdas[0]}`}
                        onClick={() => abrirEdicion(fila)}
                      >
                        <Pencil strokeWidth={1.5} />
                      </Button>
                      {accionBorrar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Borrar ${fila.celdas[0]}`}
                          onClick={() => setPorBorrar(fila)}
                        >
                          <Trash2 strokeWidth={1.5} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <form onSubmit={guardar}>
            <DialogHeader>
              <DialogTitle>{tituloFormulario}</DialogTitle>
              <DialogDescription>{descripcionFormulario}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5 sm:grid-cols-2">
              {Object.entries(ocultos).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              {editando ? <input type="hidden" name="id" value={editando.id} /> : null}

              {campos.map((campo) => (
                <CampoDeFormulario
                  key={campo.name}
                  campo={campo}
                  valor={editando?.datos[campo.name] ?? ""}
                />
              ))}

              {error ? (
                <div className="sm:col-span-2">
                  <MensajeError>{error}</MensajeError>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pendiente}>
                {pendiente ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!porBorrar} onOpenChange={() => setPorBorrar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar {porBorrar?.celdas[0]}</DialogTitle>
            <DialogDescription>
              Se va también todo lo que cuelgue de aquí. No hay forma de recuperarlo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPorBorrar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={borrar} disabled={pendiente}>
              <Trash2 strokeWidth={1.5} />
              {pendiente ? "Borrando…" : "Borrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function cnCelda(indice: number, columnas: { derecha?: boolean }[]) {
  return columnas[indice]?.derecha ? "text-right" : undefined;
}

function CampoDeFormulario({ campo, valor }: { campo: Campo; valor: string }) {
  const id = `campo-${campo.name}`;
  const contenedor = campo.medio ? "space-y-2" : "space-y-2 sm:col-span-2";

  if (campo.tipo === "switch") {
    return (
      <div className={`${contenedor} flex items-center gap-2 sm:col-span-2`}>
        <Switch id={id} name={campo.name} defaultChecked={valor !== "false"} />
        <Label htmlFor={id}>{campo.etiqueta}</Label>
      </div>
    );
  }

  return (
    <div className={contenedor}>
      <Label htmlFor={id}>{campo.etiqueta}</Label>

      {campo.tipo === "area" ? (
        <Textarea id={id} name={campo.name} rows={2} defaultValue={valor} placeholder={campo.placeholder} />
      ) : campo.tipo === "select" ? (
        <Select name={campo.name} defaultValue={valor || campo.opciones?.[0]?.valor}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={campo.placeholder ?? "Elige una opción"} />
          </SelectTrigger>
          <SelectContent>
            {campo.opciones?.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          name={campo.name}
          type={
            campo.tipo === "correo"
              ? "email"
              : campo.tipo === "telefono"
                ? "tel"
                : campo.tipo === "fecha"
                  ? "date"
                  : campo.tipo === "numero"
                    ? "number"
                    : campo.tipo === "url"
                      ? "url"
                      : "text"
          }
          required={campo.requerido}
          defaultValue={valor}
          placeholder={campo.placeholder}
        />
      )}

      {campo.ayuda ? <p className="text-meta text-ink-soft">{campo.ayuda}</p> : null}
    </div>
  );
}
