import { notFound } from "next/navigation";

/**
 * Destino de la reescritura del middleware cuando un usuario de cliente
 * abre una ruta de administración. Devuelve 404 real, no 403: confirmarle
 * que la ruta existe ya sería filtrar información.
 */
export default function RutaOculta() {
  notFound();
}
