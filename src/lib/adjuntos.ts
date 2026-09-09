/**
 * Reglas de los adjuntos, en un solo lugar.
 *
 * La lista vive aquí y se copia al bucket en la migración 007. La del bucket
 * es la que manda —se aplica en el servidor y no se puede esquivar—; ésta
 * existe para poder avisar en el navegador antes de subir 20 MB para nada.
 * Si cambias una, cambia la otra.
 *
 * Sin "server-only" a propósito: la importa un componente de cliente.
 */

/** 25 MB. Arriba de eso conviene un enlace a Drive, no un adjunto. */
export const LIMITE_BYTES = 25 * 1024 * 1024;

export const TIPOS_PERMITIDOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/zip",
  "application/x-zip-compressed",
] as const;

/** Para el atributo accept y para deducir el tipo cuando el navegador no lo da. */
const POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  zip: "application/zip",
};

export const ACEPTA = Object.keys(POR_EXTENSION)
  .map((e) => `.${e}`)
  .join(",");

export const DESCRIPCION_TIPOS =
  "PDF, Word, Excel, PowerPoint, texto, CSV, imágenes (JPG, PNG, WebP, GIF, SVG) y ZIP";

function extensionDe(nombre: string) {
  const partes = nombre.toLowerCase().split(".");
  return partes.length > 1 ? partes[partes.length - 1] : "";
}

/**
 * Windows no siempre reporta el tipo: para .webp, .svg o formatos sin entrada
 * en el registro devuelve cadena vacía. En ese caso se deduce de la extensión,
 * porque si no el bucket rechazaría archivos perfectamente válidos.
 */
export function tipoDeArchivo(archivo: File) {
  return archivo.type || POR_EXTENSION[extensionDe(archivo.name)] || "";
}

export function tipoPermitido(tipo: string) {
  return (TIPOS_PERMITIDOS as readonly string[]).includes(tipo);
}

/**
 * Qué se puede abrir dentro del navegador y qué se fuerza a descargar.
 *
 * Importa por el SVG. Un SVG es XML y puede llevar <script> dentro; si se
 * sirve en línea, ese código se ejecuta en el dominio de Supabase con la URL
 * firmada. Forzando Content-Disposition: attachment el navegador lo guarda en
 * vez de interpretarlo, y deja de ser un vector.
 *
 * Lo mismo aplica al ZIP y a los documentos de Office, que no se previsualizan
 * de todos modos. Las imágenes de mapa de bits y el PDF sí se abren en línea,
 * que es lo cómodo para revisar un pantallazo.
 */
const SE_ABREN_EN_LINEA = new Set(["jpg", "jpeg", "png", "webp", "gif", "pdf"]);

export function seSirveEnLinea(rutaONombre: string) {
  return SE_ABREN_EN_LINEA.has(extensionDe(rutaONombre));
}

/** Deja el nombre en algo que sobreviva a una URL y a un sistema de archivos. */
export function nombreSeguro(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/**
 * La ruta no es una convención de nombres: es el candado. Las políticas de
 * storage comparan el primer segmento contra las organizaciones del usuario,
 * así que escribir fuera de su carpeta se rechaza en la base.
 *
 * El prefijo de tiempo evita que dos archivos con el mismo nombre se pisen.
 */
export function rutaDeAdjunto(organizationId: string, taskId: string, nombre: string) {
  return `${organizationId}/${taskId}/${Date.now()}-${nombreSeguro(nombre)}`;
}

/** Devuelve el motivo del rechazo, o null si el archivo pasa. */
export function motivoDeRechazo(archivo: File): string | null {
  if (archivo.size > LIMITE_BYTES) {
    return `${archivo.name} pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el límite son 25 MB. Súbelo a otro lado y pega el enlace en un comentario.`;
  }

  const tipo = tipoDeArchivo(archivo);
  if (!tipoPermitido(tipo)) {
    return `No se aceptan archivos de ese tipo. Se puede adjuntar ${DESCRIPCION_TIPOS}.`;
  }

  return null;
}
