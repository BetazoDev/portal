"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { cambiarPassword, type EstadoCambio } from "./acciones";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Guardando…" : "Guardar contraseña"}
    </Button>
  );
}

export function FormularioCambio() {
  const [estado, accion] = useActionState<EstadoCambio, FormData>(cambiarPassword, {});

  return (
    <form action={accion} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          autoFocus
          required
        />
        <p className="text-muted-foreground text-xs">Al menos 10 caracteres.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmacion">Repite la contraseña</Label>
        <Input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>

      {estado.error ? (
        <p role="alert" className="text-destructive text-sm">
          {estado.error}
        </p>
      ) : null}

      <BotonGuardar />
    </form>
  );
}
