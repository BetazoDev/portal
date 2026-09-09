"use client";

import { useState, useTransition } from "react";

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

import { crearTarea } from "../acciones";

export function FormularioNuevaTarea({
  organizationId,
  proyectos,
  tipos,
}: {
  organizationId: string;
  proyectos: { id: string; nombre: string }[];
  tipos: { id: string; name: string; description: string | null; expected_days: number | null }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [tipoElegido, setTipoElegido] = useState<string>("");
  const [pendiente, iniciar] = useTransition();

  const tipo = tipos.find((t) => t.id === tipoElegido);

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
      // Si todo sale bien la acción redirige y esto no llega a ejecutarse.
      if (resultado && !resultado.ok) setError(resultado.error ?? "No se pudo crear la tarea.");
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

      {error ? <MensajeError>{error}</MensajeError> : null}

      <Button type="submit" disabled={pendiente}>
        {pendiente ? "Enviando…" : "Enviar solicitud"}
      </Button>
    </form>
  );
}
