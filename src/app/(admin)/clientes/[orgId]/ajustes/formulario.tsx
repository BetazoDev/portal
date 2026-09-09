"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

import { guardarOrganizacion } from "../acciones";

export function FormularioAjustes({
  organizacion,
}: {
  organizacion: {
    id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
    status: string;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);

    iniciar(async () => {
      const resultado = await guardarOrganizacion(datos);
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudieron guardar los cambios.");
        return;
      }
      router.refresh();
      toast.success("Cambios guardados");
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <input type="hidden" name="id" value={organizacion.id} />

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={organizacion.name} required />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact_email">Correo de contacto</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={organizacion.contact_email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Teléfono</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            defaultValue={organizacion.contact_phone ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Estado</Label>
        <Select name="status" defaultValue={organizacion.status}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="pausado">Pausado</SelectItem>
            <SelectItem value="archivado">Archivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={organizacion.notes ?? ""} />
        <p className="text-meta text-ink-soft">
          Estas notas son tuyas. La agencia no las ve en su portal.
        </p>
      </div>

      {error ? <MensajeError>{error}</MensajeError> : null}

      <Button type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
