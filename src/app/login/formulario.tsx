"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { entrar, type EstadoLogin } from "./acciones";

function BotonEntrar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}

export function FormularioLogin({ volver }: { volver?: string }) {
  const [estado, accion] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <form action={accion} className="space-y-4">
      {volver ? <input type="hidden" name="volver" value={volver} /> : null}

      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {estado.error ? (
        <p role="alert" className="text-destructive text-sm">
          {estado.error}
        </p>
      ) : null}

      <BotonEntrar />
    </form>
  );
}
