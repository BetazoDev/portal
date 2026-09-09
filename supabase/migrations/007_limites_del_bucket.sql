-- ============================================================================
--  CRM / Gestor de proyectos — Migración 007: límites reales en el bucket
--
--  El bucket estaba sin límite de tamaño y sin lista de tipos:
--
--    file_size_limit    : null
--    allowed_mime_types : null
--
--  El tope de 25 MB solo existía en subir-archivo.tsx, o sea en el navegador,
--  o sea en ningún lado: un cliente con su propio token puede llamar a la API
--  de storage y subir lo que quiera del tamaño que quiera. Y sin lista de
--  tipos entraba igual un .exe que un PDF.
--
--  Estas dos columnas las aplica el servidor de storage antes de escribir, así
--  que sí se sostienen. La validación del navegador se queda, pero como
--  cortesía —avisar antes de subir 20 MB para nada—, no como control.
--
--  La lista es la misma que src/lib/adjuntos.ts. Si cambia una, cambia la otra.
--
--  Sobre el SVG: se incluye a petición expresa. Es el único formato de imagen
--  que puede llevar <script> dentro, así que en el mismo cambio las descargas
--  pasan a servirse con Content-Disposition: attachment para todo lo que no
--  sea imagen de mapa de bits o PDF (ver seSirveEnLinea en adjuntos.ts). El
--  navegador lo guarda en vez de interpretarlo y deja de ser un vector.
-- ============================================================================

begin;

update storage.buckets
   set file_size_limit = 26214400,  -- 25 MB, el mismo número que el navegador
       allowed_mime_types = array[
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'text/plain',
         'text/csv',
         'image/jpeg',
         'image/png',
         'image/webp',
         'image/gif',
         'image/svg+xml',
         'application/zip',
         'application/x-zip-compressed'
       ]
 where id = 'task-attachments';

commit;
