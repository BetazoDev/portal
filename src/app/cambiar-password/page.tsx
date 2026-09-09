import type { Metadata } from "next";

import { FormularioCambio } from "./formulario";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default function PaginaCambioPassword() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Elige tu contraseña</h1>
          <p className="text-muted-foreground text-sm">
            La que te mandamos por correo es temporal. Cámbiala para poder entrar al sistema.
          </p>
        </div>

        <FormularioCambio />
      </div>
    </main>
  );
}
