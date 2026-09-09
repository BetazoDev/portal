"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * El componente que genera shadcn lee el tema con next-themes. Aquí el tema
 * lo maneja el guion del layout con una clase en <html>, así que se observa
 * esa clase y se evita la dependencia extra.
 */
function useTemaDeDocumento(): "light" | "dark" {
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    const raiz = document.documentElement;
    const leer = () => setTema(raiz.classList.contains("dark") ? "dark" : "light");

    leer();
    const observador = new MutationObserver(leer);
    observador.observe(raiz, { attributes: true, attributeFilter: ["class"] });
    return () => observador.disconnect();
  }, []);

  return tema;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const tema = useTemaDeDocumento();

  return (
    <Sonner
      theme={tema}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-sheet)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast" } }}
      {...props}
    />
  );
};

export { Toaster };
