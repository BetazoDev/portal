import { createBrowserClient } from "@supabase/ssr";

import { envPublico } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

/** Cliente para componentes con "use client". Solo lleva la llave anon. */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    envPublico.NEXT_PUBLIC_SUPABASE_URL,
    envPublico.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
