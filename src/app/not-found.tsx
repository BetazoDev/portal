import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold">Esta página no existe</h1>
        <p className="text-muted-foreground text-sm">
          Puede que la dirección esté mal escrita o que el contenido se haya movido.
        </p>
        <Link href="/" className="inline-block text-sm underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
