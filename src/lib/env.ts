import { z } from "zod";

/**
 * Validación de variables de entorno.
 *
 * Las de servidor se leen solo desde código de servidor. Si alguna falta,
 * es mejor reventar al arrancar que descubrirlo cuando un cliente ya está
 * usando el sistema.
 */

const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

// Next.js sustituye process.env.NEXT_PUBLIC_* en tiempo de compilación solo
// cuando se accede a la propiedad literal, así que no se puede iterar.
export const envPublico = esquemaPublico.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

const esquemaServidor = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Falta SUPABASE_SERVICE_ROLE_KEY"),
  CRM_ENCRYPTION_KEY: z.string().min(1).optional(),
  N8N_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  N8N_WEBHOOK_SECRET: z.string().optional(),
});

/**
 * Solo para Route Handlers y Server Actions. Llamarla desde un componente
 * con "use client" lanza en vez de filtrar la llave al navegador.
 */
export function envServidor() {
  if (typeof window !== "undefined") {
    throw new Error(
      "envServidor() se llamó desde el navegador. Las llaves de servidor nunca salen del servidor."
    );
  }
  return esquemaServidor.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRM_ENCRYPTION_KEY: process.env.CRM_ENCRYPTION_KEY,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
  });
}
