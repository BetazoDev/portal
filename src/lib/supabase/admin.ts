import "server-only";

import { createClient } from "@supabase/supabase-js";

import { envPublico, envServidor } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Cliente con service_role. SE SALTA RLS POR COMPLETO.
 *
 * Solo para Route Handlers y Server Actions donde ya verificaste que quien
 * llama es platform_admin. El import de "server-only" hace que el build
 * falle si este archivo llega a colarse en un árbol de cliente.
 *
 * Nunca lo uses para las pruebas de aislamiento: con esta llave todas pasan
 * en falso.
 */
export function crearClienteAdmin() {
  const { SUPABASE_SERVICE_ROLE_KEY } = envServidor();

  return createClient<Database>(
    envPublico.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
