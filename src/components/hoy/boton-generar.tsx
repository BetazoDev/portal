"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function BotonGenerarBrief({ hayBrief }: { hayBrief: boolean }) {
  const router = useRouter();
  const [generando, setGenerando] = useState(false);

  async function generar() {
    setGenerando(true);
    const respuesta = await fetch("/api/brief", { method: "POST" });
    const cuerpo = await respuesta.json().catch(() => ({}));
    setGenerando(false);

    if (!respuesta.ok) {
      toast.error("No se pudo generar el resumen", { description: cuerpo.error });
      return;
    }

    router.refresh();
    toast.success("Resumen generado");
  }

  return (
    <Button variant="outline" size="sm" onClick={generar} disabled={generando}>
      <RefreshCw strokeWidth={1.5} className={generando ? "animate-spin" : undefined} />
      {generando ? "Generando…" : hayBrief ? "Volver a generar" : "Generar ahora"}
    </Button>
  );
}
