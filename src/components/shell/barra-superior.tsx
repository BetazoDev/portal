import { LogOut } from "lucide-react";

import { InterruptorTema } from "@/components/interruptor-tema";
import { Button } from "@/components/ui/button";

export function BarraSuperior({ nombre }: { nombre: string }) {
  return (
    <header className="bg-surface border-border sticky top-0 z-20 flex h-13 shrink-0 items-center justify-end gap-2 border-b px-4">
      <span className="text-meta text-ink-soft mr-auto truncate">{nombre}</span>
      <InterruptorTema />
      <form action="/auth/salir" method="post">
        <Button type="submit" variant="ghost" size="sm" className="text-ink-soft">
          <LogOut strokeWidth={1.5} />
          Cerrar sesión
        </Button>
      </form>
    </header>
  );
}
