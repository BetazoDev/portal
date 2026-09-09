import type { NextRequest } from "next/server";

import { clienteDeMiddleware } from "@/lib/supabase/sesion-middleware";

const RUTA_LOGIN = "/login";
const RUTA_CAMBIO = "/cambiar-password";
const INICIO_ADMIN = "/";
const INICIO_PORTAL = "/portal";

/** Rutas que se ven sin sesión. */
function esPublica(ruta: string) {
  return ruta === RUTA_LOGIN || ruta.startsWith("/auth/");
}

/** Lo único que un usuario de cliente puede abrir. Todo lo demás es del dueño. */
function esRutaDeCliente(ruta: string) {
  return ruta === INICIO_PORTAL || ruta.startsWith("/portal/");
}

/** Rutas de sesión: las usan los dos roles, incluido el cierre de sesión. */
function esRutaDeAuth(ruta: string) {
  return ruta.startsWith("/auth/");
}

export async function middleware(request: NextRequest) {
  const { supabase, obtenerRespuesta, redirigir, reescribir } = clienteDeMiddleware(request);
  const ruta = request.nextUrl.pathname;

  // getUser valida el token contra el servidor de auth. getSession no: lee la
  // cookie y confía en ella, que es justo lo que no queremos en middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (esPublica(ruta)) return obtenerRespuesta();

    const destino = request.nextUrl.clone();
    destino.pathname = RUTA_LOGIN;
    destino.search = "";
    if (ruta !== INICIO_ADMIN) destino.searchParams.set("volver", ruta);
    return redirigir(destino);
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  // Sesión válida sin perfil: el trigger de alta no corrió o el perfil se
  // borró. No hay rol que resolver, así que se cierra la sesión.
  if (!perfil) {
    await supabase.auth.signOut();
    const destino = request.nextUrl.clone();
    destino.pathname = RUTA_LOGIN;
    destino.search = "?error=sin-perfil";
    return redirigir(destino);
  }

  const esAdmin = perfil.role === "platform_admin";
  const inicio = esAdmin ? INICIO_ADMIN : INICIO_PORTAL;

  // Cerrar sesión tiene que funcionar para cualquiera y en cualquier estado,
  // incluso con la contraseña temporal todavía pendiente.
  if (esRutaDeAuth(ruta)) return obtenerRespuesta();

  // Contraseña temporal: no se llega a ningún lado hasta cambiarla.
  if (perfil.must_change_password && ruta !== RUTA_CAMBIO) {
    const destino = request.nextUrl.clone();
    destino.pathname = RUTA_CAMBIO;
    destino.search = "";
    return redirigir(destino);
  }

  if (!perfil.must_change_password && ruta === RUTA_CAMBIO) {
    const destino = request.nextUrl.clone();
    destino.pathname = inicio;
    destino.search = "";
    return redirigir(destino);
  }

  if (ruta === RUTA_LOGIN) {
    const destino = request.nextUrl.clone();
    destino.pathname = inicio;
    destino.search = "";
    return redirigir(destino);
  }

  // Un usuario de cliente que escriba una URL de admin recibe 404, no 403:
  // un 403 le confirmaría que la ruta existe.
  if (!esAdmin && !esRutaDeCliente(ruta) && ruta !== RUTA_CAMBIO) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/no-encontrado";
    destino.search = "";
    return reescribir(destino);
  }

  // El dueño no usa el portal: tiene el tablero completo.
  if (esAdmin && esRutaDeCliente(ruta)) {
    const destino = request.nextUrl.clone();
    destino.pathname = INICIO_ADMIN;
    destino.search = "";
    return redirigir(destino);
  }

  return obtenerRespuesta();
}

export const config = {
  matcher: [
    /*
     * Todo menos archivos estáticos e imágenes. Sin esto el middleware
     * consultaría el perfil en cada icono y cada fuente.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
