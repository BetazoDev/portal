"use client";

import { PlugZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PROVEEDORES, necesitaLlave, proveedor as buscarProveedor } from "@/lib/proveedores";

type Ajustes = {
  provider: string;
  model: string;
  base_url: string | null;
  api_key_last4: string | null;
  has_key: boolean;
  is_active: boolean;
  daily_brief_hour: number;
  daily_brief_enabled: boolean;
  extra_instructions: string | null;
} | null;

export function FormularioLlm({ ajustes }: { ajustes: Ajustes }) {
  const router = useRouter();
  const [proveedor, setProveedor] = useState(ajustes?.provider ?? "anthropic");
  const [modelo, setModelo] = useState(ajustes?.model ?? "claude-sonnet-5");
  const [baseUrl, setBaseUrl] = useState(ajustes?.base_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [briefActivo, setBriefActivo] = useState(ajustes?.daily_brief_enabled ?? false);
  const [activo, setActivo] = useState(ajustes?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);

  const elegido = buscarProveedor(proveedor);
  const pideLlave = necesitaLlave(proveedor);

  function cambiarProveedor(valor: string) {
    setProveedor(valor);
    const sugerido = buscarProveedor(valor);
    if (!sugerido) return;
    setModelo(sugerido.modeloSugerido);
    setBaseUrl(sugerido.urlSugerida ?? "");
  }

  async function probar() {
    setError(null);
    setProbando(true);

    const respuesta = await fetch("/api/llm/probar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: proveedor,
        model: modelo,
        base_url: baseUrl || undefined,
        api_key: apiKey || undefined,
      }),
    });

    const cuerpo = await respuesta.json().catch(() => ({}));
    setProbando(false);

    if (!respuesta.ok) {
      setError(cuerpo.error ?? "No se pudo conectar con el modelo.");
      return;
    }
    toast.success("Conexión correcta", { description: `El modelo respondió: ${cuerpo.respuesta}` });
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const datos = new FormData(e.currentTarget);
    const respuesta = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: proveedor,
        model: modelo,
        base_url: baseUrl,
        api_key: apiKey || undefined,
        is_active: activo,
        daily_brief_enabled: briefActivo,
        daily_brief_hour: Number(datos.get("daily_brief_hour") ?? 8),
        extra_instructions: datos.get("extra_instructions"),
      }),
    });

    const cuerpo = await respuesta.json().catch(() => ({}));
    setGuardando(false);

    if (!respuesta.ok) {
      setError(cuerpo.error ?? "No se pudieron guardar los cambios.");
      return;
    }

    setApiKey("");
    router.refresh();
    toast.success("Cambios guardados");
  }

  return (
    <form onSubmit={guardar} className="space-y-8">
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-title-section">El modelo</h2>
          <p className="text-meta text-ink-soft max-w-[68ch]">
            Se usa para el resumen del día. La llave se cifra en el servidor antes de guardarse y
            no vuelve a salir de ahí completa.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="provider">Proveedor</Label>
            <Select value={proveedor} onValueChange={cambiarProveedor}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVEEDORES.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {p.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" value={modelo} onChange={(e) => setModelo(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_url">URL base {pideLlave ? "(opcional)" : ""}</Label>
          <Input
            id="base_url"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={elegido?.urlSugerida ?? "Déjala vacía para la oficial"}
          />
          {elegido?.ayuda ? <p className="text-meta text-ink-soft">{elegido.ayuda}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="api_key">API key {pideLlave ? "" : "(no hace falta)"}</Label>
          <Input
            id="api_key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            placeholder={
              ajustes?.has_key
                ? `Guardada, termina en ${ajustes.api_key_last4}`
                : pideLlave
                  ? "sk-…"
                  : "Este proveedor no la pide"
            }
          />
          <p className="text-meta text-ink-soft">
            {ajustes?.has_key
              ? "Déjala vacía para conservar la que ya está guardada."
              : pideLlave
                ? "Se cifra con AES-256-GCM antes de tocar la base."
                : "La autenticación la resuelve la red donde vive la pasarela."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="is_active" checked={activo} onCheckedChange={setActivo} />
          <Label htmlFor="is_active">Usar este proveedor</Label>
        </div>

        <Button type="button" variant="outline" onClick={probar} disabled={probando}>
          <PlugZap strokeWidth={1.5} />
          {probando ? "Probando…" : "Probar la conexión"}
        </Button>
      </section>

      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-title-section">Resumen diario</h2>
          <p className="text-meta text-ink-soft max-w-[68ch]">
            Cada mañana revisa tus tareas abiertas, incluidas tus notas privadas, y te dice qué
            atender, qué está en riesgo y qué se puede cerrar rápido.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="brief" checked={briefActivo} onCheckedChange={setBriefActivo} />
          <Label htmlFor="brief">Generarlo automáticamente</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="daily_brief_hour">Hora</Label>
          <Input
            id="daily_brief_hour"
            name="daily_brief_hour"
            type="number"
            min={0}
            max={23}
            defaultValue={ajustes?.daily_brief_hour ?? 8}
            className="w-24"
          />
          <p className="text-meta text-ink-soft">
            Hora de Aguascalientes. El cron de n8n dispara a esta hora.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="extra_instructions">Instrucciones extra</Label>
          <Textarea
            id="extra_instructions"
            name="extra_instructions"
            rows={4}
            defaultValue={ajustes?.extra_instructions ?? ""}
            placeholder="Qué quieres que priorice, qué clientes son delicados, cómo te gusta que te lo diga."
          />
        </div>
      </section>

      {error ? <MensajeError>{error}</MensajeError> : null}

      <Button type="submit" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
