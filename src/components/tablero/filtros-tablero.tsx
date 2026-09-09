"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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
import { Switch } from "@/components/ui/switch";
import { PRIORIDADES } from "@/lib/dominio";

const TODOS = "todos";

/**
 * Los filtros viven en la URL para poder compartir una vista tal cual se ve.
 * El de proyecto es un control del tablero, no una ruta aparte.
 */
export function FiltrosTablero({
  proyectos,
  tipos,
}: {
  proyectos: { id: string; name: string }[];
  tipos: { id: string; name: string }[];
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  const aplicar = useCallback(
    (clave: string, valor: string | null) => {
      const siguientes = new URLSearchParams(parametros.toString());
      if (!valor || valor === TODOS) siguientes.delete(clave);
      else siguientes.set(clave, valor);
      const cadena = siguientes.toString();
      router.replace(cadena ? `?${cadena}` : "?", { scroll: false });
    },
    [parametros, router]
  );

  const hayFiltros = [...parametros.keys()].length > 0;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-52 flex-1 space-y-1.5">
        <Label htmlFor="f-texto" className="text-label">
          Buscar
        </Label>
        <Input
          id="f-texto"
          defaultValue={parametros.get("texto") ?? ""}
          onChange={(e) => aplicar("texto", e.target.value)}
          placeholder="Título de la tarea"
        />
      </div>

      <div className="w-48 space-y-1.5">
        <Label htmlFor="f-proyecto" className="text-label">
          Proyecto
        </Label>
        <Select
          value={parametros.get("proyecto") ?? TODOS}
          onValueChange={(v) => aplicar("proyecto", v)}
        >
          <SelectTrigger id="f-proyecto" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los proyectos</SelectItem>
            {proyectos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-44 space-y-1.5">
        <Label htmlFor="f-tipo" className="text-label">
          Tipo
        </Label>
        <Select value={parametros.get("tipo") ?? TODOS} onValueChange={(v) => aplicar("tipo", v)}>
          <SelectTrigger id="f-tipo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t.id} value={t.name}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-40 space-y-1.5">
        <Label htmlFor="f-prioridad" className="text-label">
          Prioridad
        </Label>
        <Select
          value={parametros.get("prioridad") ?? TODOS}
          onValueChange={(v) => aplicar("prioridad", v)}
        >
          <SelectTrigger id="f-prioridad" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas</SelectItem>
            {PRIORIDADES.map((p) => (
              <SelectItem key={p.prioridad} value={p.prioridad}>
                {p.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex h-8 items-center gap-2">
        <Switch
          id="f-vencidas"
          checked={parametros.get("vencidas") === "1"}
          onCheckedChange={(v) => aplicar("vencidas", v ? "1" : null)}
        />
        <Label htmlFor="f-vencidas">Solo vencidas</Label>
      </div>

      {hayFiltros && (
        <Button variant="ghost" size="sm" onClick={() => router.replace("?", { scroll: false })}>
          <X strokeWidth={1.5} /> Quitar filtros
        </Button>
      )}
    </div>
  );
}
