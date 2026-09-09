"use client";

import { EyeOff, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type Pendiente = { id: string; text: string; done: boolean };

/**
 * Panel exclusivo del dueño.
 *
 * Vive en su propia tabla, protegida por RLS, y este componente no se importa
 * nunca desde el árbol del portal del cliente. El aviso de arriba está para
 * que quien escriba aquí no dude de si el cliente lo va a leer.
 */
export function NotasPrivadas({
  taskId,
  cuerpoInicial,
  checklistInicial,
  alGuardar,
}: {
  taskId: string;
  cuerpoInicial: string;
  checklistInicial: Pendiente[];
  alGuardar: (taskId: string, cuerpo: string, checklist: Pendiente[]) => Promise<{ ok: boolean }>;
}) {
  const [cuerpo, setCuerpo] = useState(cuerpoInicial);
  const [checklist, setChecklist] = useState<Pendiente[]>(checklistInicial);
  const [nuevo, setNuevo] = useState("");
  const [estado, setEstado] = useState<"quieto" | "guardando" | "guardado">("quieto");

  const primeraVez = useRef(true);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guardado con retraso: escribir no debe disparar una petición por tecla.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }

    setEstado("guardando");
    if (temporizador.current) clearTimeout(temporizador.current);

    temporizador.current = setTimeout(async () => {
      await alGuardar(taskId, cuerpo, checklist);
      setEstado("guardado");
      setTimeout(() => setEstado("quieto"), 1500);
    }, 700);

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [alGuardar, checklist, cuerpo, taskId]);

  function agregarPendiente() {
    const texto = nuevo.trim();
    if (!texto) return;
    setChecklist((previos) => [
      ...previos,
      { id: crypto.randomUUID(), text: texto, done: false },
    ]);
    setNuevo("");
  }

  return (
    <aside className="border-border rounded-card bg-surface-sunken space-y-4 border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <EyeOff className="text-ink-soft size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <div>
            <h2 className="text-title-card">Notas privadas</h2>
            <p className="text-meta text-ink-soft">Solo tú. El cliente no ve nada de esto.</p>
          </div>
        </div>
        <span className="text-meta text-ink-faint shrink-0">
          {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : ""}
        </span>
      </div>

      <Textarea
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        rows={6}
        placeholder="Por qué está atorada, qué falta, con quién hay que hablar. Acepta markdown."
        aria-label="Notas privadas"
        className="bg-surface font-mono text-[13px]"
      />

      <div className="space-y-2">
        <ul className="space-y-1.5">
          {checklist.map((p) => (
            <li key={p.id} className="group flex items-start gap-2">
              <Checkbox
                id={`p-${p.id}`}
                checked={p.done}
                onCheckedChange={(v) =>
                  setChecklist((previos) =>
                    previos.map((x) => (x.id === p.id ? { ...x, done: v === true } : x))
                  )
                }
                className="mt-0.5"
              />
              <label
                htmlFor={`p-${p.id}`}
                className={`text-body min-w-0 flex-1 ${p.done ? "text-ink-faint line-through" : ""}`}
              >
                {p.text}
              </label>
              <button
                type="button"
                onClick={() => setChecklist((previos) => previos.filter((x) => x.id !== p.id))}
                aria-label={`Quitar ${p.text}`}
                className="text-ink-faint hover:text-ink shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <Input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarPendiente();
              }
            }}
            placeholder="Agregar pendiente"
            aria-label="Nuevo pendiente"
            className="bg-surface"
          />
          <Button type="button" variant="outline" size="icon" onClick={agregarPendiente} aria-label="Agregar pendiente">
            <Plus strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
