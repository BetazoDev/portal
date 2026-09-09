import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { envPublico } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Cliente de servidor con la sesión del usuario. Respeta RLS: lo que devuelve
 * es exactamente lo que ese usuario tiene permitido ver.
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    envPublico.NEXT_PUBLIC_SUPABASE_URL,
    envPublico.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesPorEscribir) {
          try {
            for (const { name, value, options } of cookiesPorEscribir) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Los Server Components no pueden escribir cookies. El middleware
            // ya refrescó la sesión, así que aquí se puede ignorar.
          }
        },
      },
    }
  );
}
