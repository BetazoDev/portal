import type { Estado, Prioridad } from "@/lib/dominio";

/**
 * Qué matiz le toca a cada estado y a cada prioridad.
 *
 * Está centralizado porque la correspondencia estado→color es una decisión de
 * producto, no de un componente: si "en progreso" deja de ser ámbar tiene que
 * dejar de serlo en el badge, en la columna y en cualquier sitio nuevo. Los
 * valores de color viven en globals.css; aquí solo se decide quién usa cuál.
 *
 * Las clases van escritas enteras a propósito. Tailwind v4 genera únicamente
 * las que encuentra literales en el código, así que un `bg-tono-${x}` no
 * produciría nada: compilaría sin quejarse y se vería gris en producción.
 *
 * Los matices están repartidos para que seis estados se separen de un vistazo:
 * azul, violeta, ámbar, cian y verde. "cancelado" se queda sin tono porque
 * está fuera de juego, y dejarlo gris lo aparta sin decir "error".
 */

/** Badge de estado: borde, relleno suave y texto. */
export const ESTILO_ESTADO: Record<Estado, string> = {
  nuevo: "border-tono-nuevo/35 bg-tono-nuevo-suave text-tono-nuevo",
  en_revision: "border-tono-revision/35 bg-tono-revision-suave text-tono-revision",
  en_progreso: "border-tono-progreso/45 bg-tono-progreso-suave text-tono-progreso font-[550]",
  esperando_cliente: "border-tono-espera/50 border-dashed bg-tono-espera-suave text-tono-espera",
  hecho: "border-tono-hecho/35 bg-tono-hecho-suave text-tono-hecho",
  cancelado: "border-transparent text-ink-faint",
};

/**
 * Filete superior de la columna del tablero. Dos píxeles y nada más: la
 * columna ya se identifica por su encabezado, el color solo ayuda a saltar de
 * una a otra sin leer.
 */
export const BARRA_COLUMNA: Record<Estado, string> = {
  nuevo: "bg-tono-nuevo",
  en_revision: "bg-tono-revision",
  en_progreso: "bg-tono-progreso",
  esperando_cliente: "bg-tono-espera",
  hecho: "bg-tono-hecho",
  cancelado: "bg-border-strong",
};

/**
 * Prioridad: solo las dos altas llevan tono.
 *
 * Baja y media son la mayoría de las tareas; si todas tuvieran color, el color
 * dejaría de avisar. Urgente es el único relleno saturado de toda la interfaz,
 * y por eso funciona.
 */
export const ESTILO_PRIORIDAD: Record<Prioridad, string> = {
  baja: "border-transparent text-ink-soft",
  media: "border-border text-ink-soft",
  alta: "border-tono-alta/45 bg-tono-alta-suave text-tono-alta font-[550]",
  urgente: "border-tono-urgente bg-tono-urgente text-paper font-[550]",
};
