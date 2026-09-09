"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FormularioAltaCliente() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordAEntregar, setPasswordAEntregar] = useState<{
    correo: string;
    password: string;
    motivo: string;
  } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const datos = new FormData(e.currentTarget);
    const respuesta = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: datos.get("nombre"),
        email: datos.get("email"),
        nombreContacto: datos.get("nombreContacto"),
        telefono: datos.get("telefono"),
        notas: datos.get("notas"),
      }),
    });

    const cuerpo = await respuesta.json();
    setEnviando(false);

    if (!respuesta.ok) {
      setError(cuerpo.error ?? "No se pudo dar de alta al cliente.");
      return;
    }

    setAbierto(false);
    router.refresh();

    if (cuerpo.passwordParaEntregarAMano) {
      setPasswordAEntregar({
        correo: datos.get("email") as string,
        password: cuerpo.passwordParaEntregarAMano,
        motivo: cuerpo.avisoPendiente ?? "",
      });
    } else {
      toast.success(`${cuerpo.organizacion.nombre} quedó dado de alta`, {
        description: "Le mandamos sus datos de acceso por correo.",
      });
    }
  }

  return (
    <>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger asChild>
          <Button>
            <Plus /> Dar de alta cliente
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={enviar}>
            <DialogHeader>
              <DialogTitle>Dar de alta un cliente</DialogTitle>
              <DialogDescription>
                Le creamos su acceso y le mandamos una contraseña temporal por correo. Al entrar
                se le pide cambiarla.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la agencia</Label>
                <Input id="nombre" name="nombre" required autoFocus placeholder="Agencia Norte" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo de acceso</Label>
                <Input id="email" name="email" type="email" required placeholder="hola@agencianorte.mx" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombreContacto">Persona de contacto</Label>
                  <Input id="nombreContacto" name="nombreContacto" placeholder="Marina Ruiz" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" name="telefono" placeholder="449 123 4567" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea id="notas" name="notas" rows={2} placeholder="Cómo llegaron, qué esperan." />
              </div>
              {error ? <MensajeError>{error}</MensajeError> : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Dando de alta…" : "Dar de alta cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Solo aparece cuando n8n no pudo entregar el correo. */}
      <Dialog open={!!passwordAEntregar} onOpenChange={() => setPasswordAEntregar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>El cliente quedó creado, pero el correo no salió</DialogTitle>
            <DialogDescription>
              Motivo: {passwordAEntregar?.motivo}. Cópiale estos datos y mándaselos tú. No se
              vuelven a mostrar y no quedaron guardados en ninguna parte.
            </DialogDescription>
          </DialogHeader>

          <dl className="bg-surface-sunken rounded-card border-border grid gap-2 border p-4 font-mono text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Correo</dt>
              <dd className="truncate">{passwordAEntregar?.correo}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Contraseña</dt>
              <dd>{passwordAEntregar?.password}</dd>
            </div>
          </dl>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(
                  `Correo: ${passwordAEntregar?.correo}\nContraseña: ${passwordAEntregar?.password}`
                );
                toast.success("Datos copiados");
              }}
            >
              Copiar
            </Button>
            <Button onClick={() => setPasswordAEntregar(null)}>Ya los guardé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
