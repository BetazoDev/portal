"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { MensajeError } from "@/components/dominio/mensaje-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularioGeneral({
  nombre,
  correo,
  webhookUrl,
  secreto,
  appBaseUrl,
  adminEmail,
}: {
  nombre: string;
  correo: string;
  webhookUrl: string;
  secreto: string;
  appBaseUrl: string;
  adminEmail: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [secretoActual, setSecretoActual] = useState(secreto);

  const secretoSinCambiar = secretoActual === "CAMBIA_ESTE_VALOR";

  function generarSecreto() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    setSecretoActual(
      Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    );
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const datos = new FormData(e.currentTarget);
    const respuesta = await fetch("/api/configuracion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: datos.get("full_name"),
        n8n_webhook_url: datos.get("n8n_webhook_url"),
        n8n_webhook_secret: secretoActual,
        app_base_url: datos.get("app_base_url"),
        admin_email: datos.get("admin_email"),
      }),
    });

    const cuerpo = await respuesta.json().catch(() => ({}));
    setGuardando(false);

    if (!respuesta.ok) {
      setError(cuerpo.error ?? "No se pudieron guardar los cambios.");
      return;
    }

    router.refresh();
    toast.success("Cambios guardados");
  }

  return (
    <form onSubmit={enviar} className="space-y-8">
      <section className="space-y-5">
        <h2 className="text-title-section">Tu perfil</h2>

        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre</Label>
          <Input id="full_name" name="full_name" defaultValue={nombre} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="correo">Correo de acceso</Label>
          <Input id="correo" value={correo} disabled />
          <p className="text-meta text-ink-soft">
            Para cambiarlo hay que hacerlo desde Supabase: es el mismo con el que entras.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-title-section">Correos y automatizaciones</h2>
          <p className="text-meta text-ink-soft max-w-[68ch]">
            Los avisos salen por n8n. Mientras la URL esté vacía, la base no intenta mandarlos y
            las altas de cliente te devuelven la contraseña para que la entregues tú.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="n8n_webhook_url">URL del webhook de n8n</Label>
          <Input
            id="n8n_webhook_url"
            name="n8n_webhook_url"
            type="url"
            defaultValue={webhookUrl}
            placeholder="https://n8n.tu-dominio.tech/webhook/crm-events"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secreto">Secreto compartido</Label>
          <div className="flex gap-2">
            <Input id="secreto" value={secretoActual} readOnly className="font-mono text-[13px]" />
            <Button type="button" variant="outline" size="icon" onClick={generarSecreto} aria-label="Generar un secreto nuevo">
              <RefreshCw strokeWidth={1.5} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copiar el secreto"
              onClick={() => {
                navigator.clipboard?.writeText(secretoActual);
                toast.success("Secreto copiado");
              }}
            >
              <Copy strokeWidth={1.5} />
            </Button>
          </div>
          {secretoSinCambiar ? (
            <MensajeError>
              El secreto sigue con el valor de ejemplo. Genera uno y cópialo al nodo Webhook de
              n8n, o cualquiera podría disparar tus correos.
            </MensajeError>
          ) : (
            <p className="text-meta text-ink-soft">
              n8n valida este valor en el header <code className="font-mono">X-CRM-Secret</code>.
              Si lo cambias aquí, cámbialo también allá.
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="app_base_url">URL pública del CRM</Label>
            <Input
              id="app_base_url"
              name="app_base_url"
              type="url"
              defaultValue={appBaseUrl}
              placeholder="https://crm.tu-dominio.com"
            />
            <p className="text-meta text-ink-soft">Los enlaces de los correos salen de aquí.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_email">Tu correo para los avisos</Label>
            <Input id="admin_email" name="admin_email" type="email" defaultValue={adminEmail} />
          </div>
        </div>
      </section>

      {error ? <MensajeError>{error}</MensajeError> : null}

      <Button type="submit" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
