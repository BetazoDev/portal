"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Claro y oscuro sin dependencias: el guion del layout ya puso la clase antes
 * de pintar, así que aquí solo se lee el estado y se alterna.
 *
 * En la fase 3 esto se muda a la barra superior del shell.
 */
export function InterruptorTema() {
  const [oscuro, setOscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const siguiente = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", siguiente);
    try {
      localStorage.setItem("tema", siguiente ? "oscuro" : "claro");
    } catch {
      // Navegación privada o almacenamiento bloqueado: el tema dura la sesión.
    }
    setOscuro(siguiente);
  }

  // Hasta que el efecto corre no se sabe el tema, y adivinarlo provoca que el
  // icono parpadee al primer render.
  const etiqueta = oscuro === null ? "Cambiar tema" : oscuro ? "Usar tema claro" : "Usar tema oscuro";

  return (
    <Button variant="ghost" size="icon" onClick={alternar} aria-label={etiqueta} title={etiqueta}>
      {oscuro ? <Moon /> : <Sun />}
    </Button>
  );
}
