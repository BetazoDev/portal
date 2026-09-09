import type { Metadata } from "next";

import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; error?: string }>;
}) {
  const { volver, error } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="text-muted-foreground text-sm">
            Usa el correo con el que te dimos de alta.
          </p>
        </div>

        {error === "sin-perfil" ? (
          <p role="alert" className="text-destructive text-sm">
            Tu sesión ya no tiene un perfil asociado. Escríbenos para reactivar tu cuenta.
          </p>
        ) : null}

        <FormularioLogin volver={volver} />
      </div>
    </main>
  );
}
