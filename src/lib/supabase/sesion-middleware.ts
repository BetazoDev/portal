import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { envPublico } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Crea el cliente de Supabase para el middleware y devuelve, junto con él,
 * la respuesta donde hay que escribir las cookies de sesión refrescadas.
 *
 * Toda redirección posterior debe copiar esas cookies, o el usuario pierde
 * la sesión en el siguiente salto.
 */
export function clienteDeMiddleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    envPublico.NEXT_PUBLIC_SUPABASE_URL,
    envPublico.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesPorEscribir) {
          for (const { name, value } of cookiesPorEscribir) {
            request.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesPorEscribir) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  return {
    supabase,
    /** La respuesta viva, con las cookies que Supabase haya escrito. */
    obtenerRespuesta: () => respuesta,
    /** Redirige conservando las cookies de sesión. */
    redirigir(destino: URL) {
      const redireccion = NextResponse.redirect(destino);
      for (const cookie of respuesta.cookies.getAll()) {
        redireccion.cookies.set(cookie);
      }
      return redireccion;
    },
    /** Reescribe conservando las cookies de sesión. */
    reescribir(destino: URL) {
      const reescritura = NextResponse.rewrite(destino);
      for (const cookie of respuesta.cookies.getAll()) {
        reescritura.cookies.set(cookie);
      }
      return reescritura;
    },
  };
}
