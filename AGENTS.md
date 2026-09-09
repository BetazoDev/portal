# CRM y gestor de proyectos — Especificación de construcción

Documento de trabajo para el agente que va a construir el sistema.
Léelo completo antes de escribir la primera línea de código.

---

## 0. Cómo usar este documento

Este archivo es la fuente de verdad. Si algo aquí contradice tu criterio por
defecto, gana este documento. Si algo no está definido aquí, **pregunta antes de
inventarlo**: no asumas alcance, no agregues features, no cambies el esquema por
tu cuenta.

Trabaja por fases (sección 12). No avances a la siguiente fase hasta que la
anterior pase sus criterios de aceptación. Al terminar cada fase, reporta qué
construiste, qué probaste y qué quedó pendiente.

---

## 1. Qué es este sistema

Una herramienta tipo Asana o Monday, pero de un solo dueño y varios clientes
aislados entre sí.

- **El dueño** es un desarrollador web freelance en Aguascalientes. Es el único
  `platform_admin`. Ve todo, mueve todo, decide todo.
- **Los clientes** son agencias de marketing que lo subcontratan. Cada una tiene
  su propio usuario y solo ve su propia información.
- **Los clientes finales** son los clientes de esas agencias. La agencia los
  captura en el sistema.
- Cada cliente final tiene proyectos, y cada proyecto tiene tareas.

El flujo diario: la agencia crea una tarea, al dueño le llega un correo, la
revisa, la mueve en su tablero kanban, y cada movimiento dispara correos a las
dos partes con textos distintos.

**Regla que atraviesa todo el sistema: la información de un cliente jamás toca
la de otro.** No es una preferencia de UX, es el requisito principal.

---

## 2. Reglas de operación del agente

### 2.1 Supabase (vía MCP)

Tienes conexión MCP a una instancia de Supabase **self-hosted sobre Dokploy**.

- Las migraciones `001_esquema_inicial.sql` y `002_tipos_llm_notificaciones.sql`
  ya están escritas. Colócalas en `supabase/migrations/` y **aplícalas en orden**,
  una a la vez, verificando el resultado de cada una antes de seguir.
- Todo cambio posterior al esquema va en un archivo de migración numerado nuevo.
  Nunca modifiques una migración ya aplicada. Nunca ejecutes DDL suelto que no
  quede versionado en el repositorio.
- **Nunca desactives RLS**, ni siquiera temporalmente para depurar. Si una
  consulta no devuelve lo esperado, el problema es la política, no el RLS.
- **Nunca uses la `service_role` key en código que llegue al navegador.** Va
  exclusivamente en Route Handlers y Server Actions. Si la ves en un archivo con
  `"use client"`, es un bug de seguridad, no un detalle.
- Antes de cualquier operación destructiva (`drop`, `truncate`, borrado masivo),
  pregunta. No la ejecutes por iniciativa propia.
- No crees tablas nuevas sin justificarlas contra este documento.

### 2.2 n8n (vía MCP)

Tienes conexión MCP a la instancia de n8n del dueño.

- Crea los workflows de la sección 9.
- **No publiques (actives) ningún workflow sin haberlo probado antes con pin
  data.** Un workflow activo con un bug manda correos reales a clientes reales.
- El correo sale por **BillionMail**, alojado en el mismo VPS. Usa el nodo SMTP
  apuntando a esa instancia, no a un proveedor externo.
- Cada workflow valida el header `X-CRM-Secret` como primer nodo. Si no coincide
  con el secreto de `app_config`, corta la ejecución sin procesar nada.

### 2.3 Qué no debes hacer

- No mockear datos que ya existen en la base. Consulta la base real por MCP.
- No dejar `TODO` o funciones vacías en código que reportes como terminado.
- No instalar dependencias que no estén en la sección 3 sin preguntar.
- No cambiar los nombres de tablas, columnas ni enums de las migraciones.

---

## 3. Stack

Fijo. No lo sustituyas.

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15, App Router, TypeScript estricto |
| Estilos | Tailwind CSS |
| Componentes base | shadcn/ui |
| Base de datos, auth, storage, realtime | Supabase self-hosted |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Estado de servidor | TanStack Query |
| Formularios | react-hook-form + zod |
| Fechas | date-fns, locale `es` |
| Automatizaciones y correo | n8n + BillionMail |
| Deploy | Dokploy |

No uses `react-beautiful-dnd`: está sin mantenimiento y falla con React 19.

Todo el texto de interfaz va en **español de México**. Fechas en formato
`d 'de' MMMM` (ej. "14 de septiembre"). Zona horaria `America/Mexico_City`.

---

## 4. Modelo de datos

Está completo en las dos migraciones. Resumen de la jerarquía:

```
profiles (platform_admin | client_owner | client_member)
organizations                        ← los clientes del dueño
  └── memberships                    ← quién pertenece a qué organización
  └── task_types                     ← catálogo de tipos de tarea por cliente
  └── end_clients                    ← los clientes de la agencia
        └── projects
              └── tasks
                    ├── comments
                    ├── attachments
                    ├── task_events           (bitácora, la escriben triggers)
                    └── task_private_notes    (SOLO el dueño, tabla aparte)
```

Tablas de soporte: `app_config`, `pending_invitations`, `notifications`,
`llm_settings`, `daily_briefs`, `email_log`.

Vista `v_board_tasks`: úsala para pintar el kanban. Tiene `security_invoker = true`,
así que respeta el RLS de quien consulta. No la reemplaces por consultas sueltas
con joins en el cliente.

Columnas del tablero, en este orden exacto:

`nuevo` → `en_revision` → `en_progreso` → `esperando_cliente` → `hecho` → `cancelado`

Etiquetas visibles: Nuevas · En revisión · En progreso · Esperando cliente ·
Hecho · Cancelado.

---

## 5. Seguridad: reglas no negociables

1. **Aislamiento por organización.** Toda consulta pasa por RLS. Nunca filtres
   por `organization_id` solo en el cliente y confíes en eso.
2. **El cliente no mueve tarjetas.** El trigger `guard_task_update` lo bloquea a
   nivel base de datos y lanza error `42501`. La UI también debe ocultar el
   drag, pero la UI no es el candado.
3. **Notas privadas.** `task_private_notes` es admin-only por RLS. Además, el
   componente que las renderiza no debe importarse nunca en el árbol del portal
   del cliente. Márcalo visualmente como privado en la UI del dueño.
4. **API key del LLM.** Se cifra con AES-256-GCM en el servidor antes de
   guardarse. La tabla `llm_settings` tiene RLS sin políticas: solo
   `service_role` la lee. La UI consulta `get_llm_settings()`, que devuelve los
   últimos 4 caracteres y nada más.
5. **Contraseña temporal.** Se genera, se manda por correo una sola vez y no se
   guarda en ninguna tabla ni en logs. `must_change_password = true` fuerza el
   cambio en el primer acceso vía middleware.
6. **Storage.** Bucket privado. Rutas con formato `{organization_id}/{task_id}/{archivo}`.
   Las descargas se sirven con URLs firmadas de vigencia corta, nunca públicas.

---

## 6. Sistema de diseño

### 6.1 Origen del diseño

El dueño colocará imágenes de referencia en:

```
docs/referencias-diseno/
```

**Esas imágenes definen el diseño. No es una sugerencia ni un punto de partida
que puedas reinterpretar.**

Si la carpeta está vacía o no existe cuando llegues a la Fase 2, **detente y
pídelas**. No arranques con un diseño propio "provisional" para no bloquearte:
un provisional se queda, y rehacerlo cuesta más que esperar.

### 6.2 Proceso obligatorio antes de escribir UI

1. Abre y revisa **todas** las imágenes de la carpeta, una por una.
2. Escribe `docs/DESIGN_TOKENS.md` con lo que extraigas (formato en 6.3).
3. Preséntale ese documento al dueño y espera su visto bueno.
4. Solo entonces traduce los tokens a variables CSS en `app/globals.css` y a
   `tailwind.config.ts`.
5. Construye una ruta `/estilo` (solo admin, fuera de navegación) que muestre
   todos los componentes base con los tokens aplicados: botones en sus estados,
   inputs, tarjeta de kanban, chips de tipo y prioridad, badges de estado,
   tablas, modales, toasts y estados vacíos. Es tu espejo para revisar.

### 6.3 Qué extraer de las imágenes

`docs/DESIGN_TOKENS.md` debe contener, con valores concretos y no descripciones
vagas:

**Color.** De 4 a 6 valores hex base, nombrados por función y no por color
(`superficie`, `superficie-elevada`, `borde`, `texto-primario`, `texto-suave`,
`acento`). Aparte: los colores de estado de las seis columnas del kanban, y los
de prioridad. Si las referencias traen modo claro y oscuro, define ambos.

**Tipografía.** Familias exactas y sus roles. Escala tipográfica completa con
tamaño, peso, interlineado y tracking por nivel. Si no logras identificar la
familia exacta de la imagen, propón dos alternativas cercanas disponibles en
Google Fonts o Fontsource y deja que el dueño elija.

**Espaciado y densidad.** La unidad base y la escala. Este punto importa más de
lo normal: un kanban es una interfaz densa, y la diferencia entre que se sienta
profesional o amateur casi siempre está en la densidad, no en el color.

**Forma.** Radios por tipo de elemento (no un radio único para todo), grosores
de borde, y cómo se separa un plano de otro: ¿sombra, borde, cambio de
superficie? Elige uno y sé consistente.

**Anatomía de la tarjeta de kanban.** Qué se ve y en qué orden. Cómo se
representa el tipo de tarea, la prioridad, la fecha de entrega y el estado
vencido. Cuánto padding. Cómo se ve mientras se arrastra.

**Sidebar.** Ancho expandido y colapsado, tratamiento del ítem activo,
indentación de los proyectos anidados, y cómo se ve el desplegable abierto
contra el cerrado.

**Iconografía.** Familia y grosor. Usa una sola.

### 6.4 Reglas de diseño que aplican pase lo que pase

Las imágenes mandan sobre todo lo demás. En lo que las imágenes no definan,
sigue esto:

- Todo el texto en español de México, en tono conversable y directo. Los botones
  dicen lo que hacen: "Guardar cambios", no "Enviar". La acción conserva el
  mismo nombre en toda la ruta: si el botón dice "Publicar", el aviso dice
  "Publicado".
- Los estados vacíos son una invitación a actuar, no un adorno. "Todavía no hay
  tareas en este proyecto. Crea la primera." Nunca "No hay datos disponibles".
- Los errores explican qué pasó y cómo se arregla. No piden disculpas ni son
  vagos.
- Nada de mayúsculas sostenidas para etiquetas.
- Nada de etiquetas tipo eyebrow encima de cada encabezado.
- Nada de cadenas de metadatos unidas con puntos medios.
- Nada de flechas "→" pegadas al texto de los botones.
- Un solo radio de borde para todo, sombra gris suave idéntica en cada tarjeta y
  degradados decorativos: son el kit por defecto y hacen que la herramienta
  parezca plantilla. Evítalos salvo que las referencias los muestren.
- Movimiento: solo el que responde a una acción del usuario (abrir, arrastrar,
  confirmar, colapsar). Nada de entradas con fade-and-slide en cada sección.
  Respeta `prefers-reduced-motion`.
- Piso de calidad, sin anunciarlo: responsive hasta móvil, foco de teclado
  visible, contraste accesible.

---

## 7. Arquitectura de la aplicación

### 7.1 Rutas

```
/login
/cambiar-password                       middleware fuerza aquí si must_change_password

(admin)
/                                       Hoy: brief del LLM, entradas nuevas, por vencer
/clientes                               lista de organizaciones
/clientes/[orgId]                       TABLERO KANBAN del cliente + filtro por proyecto
/clientes/[orgId]/clientes-finales
/clientes/[orgId]/proyectos
/clientes/[orgId]/tipos-de-tarea
/clientes/[orgId]/ajustes
/tareas/[taskId]                        detalle completo
/configuracion                          perfil, correo, secreto de n8n
/configuracion/llm                      proveedor, modelo, API key, brief diario
/estilo                                 catálogo de componentes (oculto)

(portal del cliente)
/portal                                 su tablero, solo lectura
/portal/nueva-tarea
/portal/clientes-finales                CRUD de sus clientes
/portal/proyectos                       CRUD de sus proyectos
/portal/tareas/[taskId]                 detalle, sin notas privadas
```

El middleware resuelve el rol y redirige: `platform_admin` a `/`, cualquier otro
a `/portal`. Un usuario de cliente que escriba una URL de admin recibe 404, no
403: no le confirmes que la ruta existe.

### 7.2 Sidebar — requisito estricto

Es la pieza que el dueño pidió de forma explícita y no se puede simplificar.

- Lista de clientes desplegable, comportamiento estilo ChatGPT: cada cliente es
  un disclosure que al abrirse muestra sus proyectos anidados.
- Se pueden tener varios clientes abiertos a la vez.
- El estado de apertura y el ancho persisten en `localStorage` y sobreviven a la
  recarga.
- Buscador arriba de la lista que filtra por nombre de cliente y de proyecto.
- Colapsable completo a modo icono.
- Navegación por teclado: flechas para moverse, Enter para abrir, `Cmd/Ctrl+K`
  para el buscador.
- El cliente activo y el proyecto activo se distinguen visualmente entre sí, no
  con el mismo tratamiento.
- Con muchos clientes debe seguir siendo usable: virtualiza si pasan de 50.

### 7.3 Kanban

- Un tablero por cliente. El filtro por proyecto es un control dentro del
  tablero, no una ruta distinta.
- Filtros adicionales: tipo de tarea, prioridad, solo vencidas, texto libre.
  Los filtros activos se reflejan en la URL para poder compartir la vista.
- Drag and drop con dnd-kit. Al soltar, actualización optimista inmediata y
  reversión con aviso si el servidor rechaza.
- `sort_order` es fraccionario: al soltar entre dos tarjetas, calcula el
  promedio de sus valores y actualiza **una sola fila**. Nunca reescribas la
  columna completa. Renormaliza en background si el espacio entre dos vecinas
  baja de `0.0001`.
- Suscripción realtime a `tasks` filtrada por `organization_id`. Cancélala al
  desmontar y al cambiar de cliente.
- El portal del cliente renderiza el mismo tablero sin handlers de arrastre, no
  un componente distinto. Menos código y menos riesgo de que se desincronicen.

### 7.4 Detalle de tarea

Cabecera con título editable en línea, tipo, prioridad, estado, fecha de
entrega, proyecto y cliente final.

Tres pestañas: Actividad (desde `task_events`, en lenguaje humano: "Humberto
movió esta tarea a En progreso"), Comentarios y Archivos.

Panel lateral **Notas privadas**, exclusivo del dueño: markdown y checklist,
guardado con debounce. Debe verse claramente que el cliente no lo ve.

---

## 8. Alta de cliente

Endpoint `POST /api/clientes`, Route Handler con `service_role`, verificando
primero que quien llama es `platform_admin`.

1. `insert` en `organizations` — el trigger siembra los tipos de tarea base.
2. Genera contraseña temporal con `crypto.randomBytes`, 16 caracteres.
3. `auth.admin.createUser({ email, password, email_confirm: true })`.
4. `update profiles set must_change_password = true, invited_at = now()`.
5. `insert` en `memberships` con rol `client_owner`.
6. `POST` al webhook de n8n con evento `user.created` y la contraseña en claro,
   **una sola vez**. No se persiste, no se registra en logs, no vuelve en la
   respuesta HTTP.

Si cualquier paso falla después del 3, revierte el usuario creado. Un usuario
huérfano sin membresía deja el sistema en estado inconsistente.

---

## 9. Automatizaciones en n8n

Un webhook único `/crm-events` recibe todos los eventos y un nodo Switch reparte
por el campo `event`. El payload ya viene enriquecido desde Postgres con
nombres, correos y destinatarios resueltos: **no consultes de vuelta a Supabase
desde n8n**.

```
Webhook /crm-events
  └─ IF  header X-CRM-Secret válido        (si no: corta, sin responder detalles)
      └─ Switch por {{ $json.event }}
           ├── user.created      → 1 correo: credenciales al cliente
           ├── task.created      → 2 correos: aviso al dueño + acuse al cliente
           ├── task.updated      → 2 correos con textos distintos
           └── comment.created   → 2 correos
```

Dos nodos de envío separados por audiencia, no un CC. Los textos son distintos y
el log necesita saber cuál de los dos falló.

**Correo al cliente:**
> La tarea *Rediseño de la página de contacto* del proyecto *Sitio Lumina* pasó
> de **En progreso** a **Esperando cliente**. Fecha de entrega: 14 de septiembre.

**Correo al dueño:**
> Moviste *Rediseño de la página de contacto* · Agencia Norte / Lumina Dental /
> Sitio Lumina · En progreso → Esperando cliente · vence en 3 días.

Después de cada envío, `POST` a `/rest/v1/email_log` con `service_role`
registrando `event`, `audience`, `recipient_email`, `subject` y `status`.

Un evento `task.updated` puede traer varios cambios en el array `changes`.
Redacta un solo correo que los mencione todos. No mandes uno por cambio.

Workflow adicional: **cron del brief diario**, a la hora de
`llm_settings.daily_brief_hour`, solo si `daily_brief_enabled` es true.

---

## 10. LLM y brief diario

Configurable desde `/configuracion/llm`: proveedor, modelo, base URL opcional
(para Ollama), API key, hora del brief y instrucciones extra del dueño.

Al guardar la key: cifrado AES-256-GCM en el servidor con
`CRM_ENCRYPTION_KEY`, guardando `ciphertext`, `iv`, `tag` y `last4`. La UI nunca
recibe la key completa. Botón para probar la conexión antes de guardar.

El brief se genera en el servidor con las tareas abiertas del dueño: título,
tipo, prioridad, fecha de entrega, estado, cliente, proyecto, días sin
movimiento y **las notas privadas y el checklist**, que son donde está el
contexto real de por qué algo está atorado.

La salida es markdown corto y accionable: qué atender hoy y por qué, qué está en
riesgo de incumplir la fecha, y qué se puede cerrar rápido. Se guarda en
`daily_briefs` (única por día) y se muestra en `/`.

Si la llamada al LLM falla, la pantalla `/` sigue funcionando y muestra las
tareas sin el brief. El brief es un extra, nunca un bloqueo.

---

## 11. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # solo servidor
CRM_ENCRYPTION_KEY=                   # 32 bytes en base64, para la API key del LLM
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

`CRM_ENCRYPTION_KEY` debe respaldarse fuera de la base de datos. Si se pierde,
la API key guardada es irrecuperable y hay que capturarla de nuevo.

---

## 12. Fases y criterios de aceptación

### Fase 1 — Base de datos y autenticación
Aplicar las dos migraciones por MCP. Promover al dueño a `platform_admin`.
Login, logout, middleware por rol, pantalla de cambio de contraseña.

**Acepta cuando:** las pruebas de aislamiento de la sección 13 pasan todas.
No avances si alguna falla.

### Fase 2 — Sistema de diseño
Revisar las imágenes de referencia, escribir `DESIGN_TOKENS.md`, obtener visto
bueno, aplicar tokens y construir `/estilo`.

**Acepta cuando:** el dueño aprueba `DESIGN_TOKENS.md` y `/estilo` muestra todos
los componentes base.

### Fase 3 — Layout y sidebar
Shell de la aplicación con el sidebar desplegable completo, con todo lo del
punto 7.2.

**Acepta cuando:** el estado abierto persiste tras recargar, el buscador filtra
clientes y proyectos, y se puede navegar todo el sidebar con teclado.

### Fase 4 — Clientes, clientes finales y proyectos
CRUD completo del lado admin. Alta de cliente con contraseña temporal
funcionando de punta a punta.

**Acepta cuando:** se da de alta un cliente, le llega el correo por BillionMail,
entra, se le fuerza el cambio de contraseña y ve su portal vacío.

### Fase 5 — Kanban
Tablero por cliente, filtro por proyecto, drag and drop, realtime, detalle de
tarea con notas privadas.

**Acepta cuando:** arrastrar actualiza una sola fila, dos navegadores abiertos
se sincronizan, y el cliente no puede arrastrar ni por UI ni por API.

### Fase 6 — Portal del cliente
Tablero en lectura, creación de tareas, CRUD de sus clientes finales y
proyectos.

**Acepta cuando:** un cliente crea una tarea, cae en la columna Nuevas del
tablero del dueño, y ninguna de las dos partes ve datos de la otra organización.

### Fase 7 — Automatizaciones
Los cuatro workflows de n8n, probados con pin data antes de publicarse.
Registro en `email_log`.

**Acepta cuando:** cada evento genera exactamente dos correos con textos
distintos, y un `task.updated` con tres cambios genera un solo correo.

### Fase 8 — LLM y brief diario
Pantalla de configuración con cifrado, prueba de conexión, generación del brief
y cron en n8n.

**Acepta cuando:** la API key nunca aparece completa en ninguna respuesta HTTP y
el brief se genera con las notas privadas incluidas.

---

## 13. Pruebas de aislamiento

Obligatorias al terminar la Fase 1 y repetibles al cerrar cada fase posterior.
Crea dos organizaciones de prueba, A y B, con un usuario cada una.

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Usuario A consulta `tasks` | Solo filas de A |
| 2 | Usuario A consulta la tarea de B por ID directo | 0 filas |
| 3 | Usuario A intenta `update` de estado en su propia tarea | Error `42501` |
| 4 | Usuario A consulta `task_private_notes` | 0 filas |
| 5 | Usuario A consulta `llm_settings` | 0 filas |
| 6 | Usuario A descarga un archivo de B por ruta directa | Denegado |
| 7 | Usuario A consulta `organizations` | Solo la suya |
| 8 | Admin consulta todo lo anterior | Acceso completo |
| 9 | Usuario A abre una ruta `/clientes/...` | 404 |
| 10 | `v_board_tasks` desde la sesión de A | Solo tareas de A |

Ejecuta estas pruebas contra la base real por MCP, con las sesiones reales de
cada usuario. No las simules con `service_role`: esa llave se salta RLS y todas
pasarían en falso.

---

## 14. Al terminar cada fase

Reporta en este formato:

- Qué construiste.
- Qué probaste y con qué resultado.
- Qué decisiones tomaste que no estaban en este documento, y por qué.
- Qué quedó pendiente o dudoso.

Si algo de este documento resultó incorrecto o incompleto al implementarlo,
dilo. Es mejor corregir la especificación que construir sobre algo que ya sabes
que está mal.
