# Sistema de diseño — tokens

Estado: **aprobado y aplicado.** Vive en `src/app/globals.css` y se revisa en
la ruta `/estilo`. Fase 2 cerrada.

Decisiones del dueño: **Geist Sans**, **monocromo estricto**, y la imagen de
`docs/` como única referencia.

## De dónde sale

Dos fuentes:

1. **`docs/84a36dd2550e293f7cf57405b71eb5e0.jpg`**, la única imagen de referencia
   que encontré. De ella tomo estructura, densidad, anatomía de tarjeta,
   sidebar, radios y jerarquía tipográfica.
2. **Tu instrucción directa: blanco y negro, con modo claro y oscuro.** Esto
   gana sobre el color de la imagen, que es morado sobre lavanda.

Consecuencia: la base del sistema es escala de grises pura (croma 0 en OKLCH).
El acento estructural es el contraste. En modo claro es tinta casi negra; en
modo oscuro, papel casi blanco. Todo lo que en una interfaz normal se
resolvería con color se resuelve aquí con **peso, relleno, borde y glifo**.

> **Revisión de septiembre de 2026.** El dueño pidió después añadir tono a
> estados y prioridades, discreto y en los dos modos. Se añadió **encima** del
> sistema existente, sin quitarle nada: el glifo, el borde punteado, el peso y
> el filete de vencido siguen ahí y siguen distinguiendo por sí solos. Quitando
> todo el color, la interfaz se sigue leyendo igual — ésa fue la condición.
>
> El gris sigue siendo la base. El tono es una capa de reconocimiento rápido,
> no el portador del significado. Ver **Tonos semánticos** más abajo.

---

## 1. Color

Escala de grises en OKLCH. Cada valor nombrado por función, no por color.

### Modo claro

| Token | OKLCH | Hex aprox. | Uso |
|---|---|---|---|
| `--paper` | `oklch(0.980 0 0)` | `#f7f7f7` | Fondo de página |
| `--surface` | `oklch(1 0 0)` | `#ffffff` | Tarjetas, paneles, barra superior |
| `--surface-sunken` | `oklch(0.962 0 0)` | `#f1f1f1` | Columnas del kanban, sidebar, filas alternas |
| `--border` | `oklch(0.916 0 0)` | `#e5e5e5` | Separación por defecto |
| `--border-strong` | `oklch(0.850 0 0)` | `#d0d0d0` | Input con foco, borde de elemento activo |
| `--ink` | `oklch(0.185 0 0)` | `#1c1c1c` | Texto primario, acento, botón primario |
| `--ink-soft` | `oklch(0.556 0 0)` | `#757575` | Texto secundario, metadatos (4.7:1 sobre papel) |
| `--ink-faint` | `oklch(0.700 0 0)` | `#a3a3a3` | Placeholder, iconos inactivos, texto cancelado |

### Modo oscuro

| Token | OKLCH | Hex aprox. | Uso |
|---|---|---|---|
| `--paper` | `oklch(0.155 0 0)` | `#1a1a1a` | Fondo de página |
| `--surface` | `oklch(0.195 0 0)` | `#232323` | Tarjetas, paneles, barra superior |
| `--surface-sunken` | `oklch(0.135 0 0)` | `#161616` | Columnas del kanban, sidebar |
| `--border` | `oklch(0.285 0 0)` | `#383838` | Separación por defecto |
| `--border-strong` | `oklch(0.380 0 0)` | `#4d4d4d` | Input con foco, borde de elemento activo |
| `--ink` | `oklch(0.975 0 0)` | `#f7f7f7` | Texto primario, acento, botón primario |
| `--ink-soft` | `oklch(0.680 0 0)` | `#9c9c9c` | Texto secundario (7:1 sobre papel) |
| `--ink-faint` | `oklch(0.520 0 0)` | `#707070` | Placeholder, iconos inactivos |

En oscuro el fondo **no** es negro puro: `#1a1a1a` evita el halo que produce el
texto blanco sobre negro absoluto en pantallas OLED.

### Tonos semánticos

Añadidos en septiembre de 2026 sobre el sistema en gris, no en su lugar.

Cada tono tiene dos variantes —la de línea y texto, y una `-suave` para
rellenos— y **valores distintos por modo**. No es el mismo color con opacidad:
en claro la luminosidad baja a 0.45 para que el texto contraste sobre el
relleno suave, y en oscuro sube a ~0.78 sobre un relleno de 0.28. El croma
baja un punto en oscuro porque sobre fondo negro el mismo croma se percibe
más intenso.

| Uso | Matiz | Claro | Oscuro |
|---|---|---|---|
| `nuevo` | 250 azul | `oklch(0.45 0.13 250)` | `oklch(0.78 0.10 250)` |
| `en_revision` | 292 violeta | `oklch(0.45 0.14 292)` | `oklch(0.78 0.11 292)` |
| `en_progreso` | 85 ámbar | `oklch(0.45 0.10 85)` | `oklch(0.82 0.11 85)` |
| `esperando_cliente` | 195 cian | `oklch(0.45 0.09 195)` | `oklch(0.80 0.08 195)` |
| `hecho` | 155 verde | `oklch(0.45 0.11 155)` | `oklch(0.79 0.11 155)` |
| `alta` | 55 naranja | `oklch(0.45 0.12 55)` | `oklch(0.80 0.12 55)` |
| `urgente` | 25 rojo | `oklch(0.45 0.17 25)` | `oklch(0.76 0.15 25)` |

Los matices están repartidos para que seis estados se separen de un vistazo.
**Croma bajo a propósito** (0.08–0.17): el tono tiene que orientar, no gritar.

**Quién se queda sin tono, y por qué.** `cancelado` está fuera de juego y se
deja en gris: apartarlo de la vista es más útil que darle un color que diga
«error». Las prioridades `baja` y `media` también, porque son la mayoría de
las tareas y si todo tuviera color el color dejaría de avisar de nada.

Contraste medido en el navegador, texto sobre su propio relleno, los catorce
pares: **de 6.16:1 a 8.46:1**. Todos por encima del 4.5:1 que pide AA para
texto pequeño.

La correspondencia estado→matiz vive en `src/lib/tonos.ts`, no en los
componentes: es una decisión de producto y tiene que cambiarse en un solo
sitio. Las clases van escritas enteras porque Tailwind v4 solo genera las que
encuentra literales — un `bg-tono-${x}` compila sin quejarse y se ve gris en
producción.

### Los seis estados del tablero

El estado se codifica con **glifo + relleno**, y el tono se suma encima. El
glifo va siempre acompañado de su etiqueta: nunca depende solo de la forma, ni
solo del color.

| Estado | Etiqueta | Glifo | Tratamiento del badge |
|---|---|---|---|
| `nuevo` | Nuevas | círculo sin relleno | borde 1px `--border-strong`, texto `--ink` |
| `en_revision` | En revisión | círculo con mitad rellena | fondo `--surface-sunken`, texto `--ink` |
| `en_progreso` | En progreso | círculo relleno | borde 1px `--ink`, texto `--ink`, peso 550 |
| `esperando_cliente` | Esperando cliente | círculo punteado | borde 1px punteado `--border-strong`, texto `--ink-soft` |
| `hecho` | Hecho | palomita | fondo `--surface-sunken`, texto `--ink-soft` |
| `cancelado` | Cancelado | tache | texto `--ink-faint`, título tachado |

En el tablero la columna **es** el estado, así que la tarjeta no repite el badge.
El badge aparece en la pantalla Hoy, en el detalle y en listas.

### Las cuatro prioridades

Escalan en peso visual, no en tono. La inversión se reserva para `urgente`: es
el recurso más fuerte que existe en blanco y negro y pierde efecto si se usa dos
veces.

| Prioridad | Glifo (Lucide) | Chip |
|---|---|---|
| `baja` | `ChevronDown` | sin fondo ni borde, texto `--ink-soft` |
| `media` | `Minus` | borde 1px `--border`, texto `--ink-soft` |
| `alta` | `ChevronUp` | fondo `--surface-sunken`, borde 1px `--border-strong`, texto `--ink`, peso 550 |
| `urgente` | `ChevronsUp` | fondo `--ink`, texto `--paper` |

### Vencido

Sin rojo: la tarjeta vencida lleva un filete izquierdo de 2px en `--ink`, la
fecha pasa a `--ink` peso 600 y se le antepone `AlertTriangle` de 14px. Es la
única tarjeta del tablero con filete, así que se distingue de un vistazo.

### Los colores que la base guarda y la interfaz no usa

`task_types.color` y `projects.color` guardan hex (rojo, ámbar, azul, morado,
verde, gris). **Monocromo estricto: no se pintan.** El tipo de tarea se lee
como texto en un chip y el proyecto como texto. Las columnas siguen en la base
por si algún día cambia la decisión; simplemente no se renderizan.

### Acciones destructivas

Sin rojo, un botón de borrar no puede avisar por color. Los dos recursos
fuertes ya están ocupados: el sólido es del botón primario y la inversión en
reposo es de la prioridad urgente. Así que lo destructivo se distingue por
**contorno marcado en `--ink`, peso 600, icono de bote** y se invierte al pasar
el cursor. Y, como el color no puede cargar la advertencia, **toda acción
destructiva va detrás de una confirmación que nombra lo que se pierde.**

---

## 2. Tipografía

**Geist Sans**, cargada con `next/font`. Diseñada para interfaz densa, cifras
tabulares nativas, se lee bien a 12–14px, que es donde vive casi todo este
sistema. Mono: **Geist Mono**, solo para identificadores y fragmentos de código.

Escala, calculada para una interfaz densa. Base 14px.

| Nivel | Tamaño | Interlineado | Peso | Tracking | Uso |
|---|---|---|---|---|---|
| `title-page` | 20px | 28px | 600 | -0.01em | Título de pantalla |
| `title-section` | 16px | 24px | 600 | -0.005em | Encabezado de bloque |
| `title-card` | 14px | 20px | 600 | 0 | Título de tarjeta y de tarea |
| `body` | 14px | 20px | 400 | 0 | Texto general, inputs |
| `meta` | 13px | 18px | 400 | 0 | Fechas, nombres de proyecto, contadores |
| `label` | 12px | 16px | 500 | +0.01em | Etiquetas de campo, encabezado de columna |
| `chip` | 12px | 16px | 500 | 0 | Chips de tipo y prioridad |

Sin mayúsculas sostenidas en ningún nivel. Cifras de contadores y fechas con
`font-variant-numeric: tabular-nums`.

---

## 3. Espaciado y densidad

Unidad base **4px**. Escala: 4, 8, 12, 16, 20, 24, 32, 40, 48.

| Medida | Valor |
|---|---|
| Ancho de columna del kanban | 288px |
| Separación entre columnas | 12px |
| Separación entre tarjetas | 8px |
| Padding de tarjeta de kanban | 12px |
| Padding de panel y modal | 20px |
| Alto de fila en tablas | 40px |
| Alto de control (botón, input, select) | 32px estándar, 36px en formularios largos |
| Alto de ítem del sidebar | 32px |
| Alto de la barra superior | 52px |
| Ancho máximo de línea de texto | 68ch |

La densidad es el punto donde un kanban se siente profesional o de plantilla.
Los valores de arriba son deliberadamente compactos: 12px de padding en la
tarjeta, no 16px; 32px de alto de control, no 40px.

---

## 4. Forma y separación de planos

Radios distintos por tipo de elemento:

| Token | Valor | Aplica a |
|---|---|---|
| `--radius-control` | 8px | Botones, inputs, selects, ítems del sidebar |
| `--radius-card` | 10px | Tarjetas de kanban, paneles, tarjetas de lista |
| `--radius-sheet` | 12px | Modales, drawers, popovers grandes |
| `--radius-chip` | 6px | Chips de tipo, prioridad y estado |
| `--radius-pill` | 999px | Solo avatares y contadores circulares |

**Un solo mecanismo de separación: borde de 1px más cambio de superficie.**
Nada de sombra en elementos en reposo. La sombra existe únicamente para lo que
de verdad flota:

| Token | Valor | Uso |
|---|---|---|
| `--shadow-overlay` | claro `0 8px 24px -8px oklch(0 0 0 / .18)` · oscuro `0 8px 24px -8px oklch(0 0 0 / .55)` | Dropdown, popover, modal, tooltip |
| `--shadow-drag` | claro `0 12px 28px -10px oklch(0 0 0 / .28)` · oscuro `0 12px 28px -10px oklch(0 0 0 / .65)` | Tarjeta levantada mientras se arrastra |

Sin degradados decorativos en ningún lado.

---

## 5. Anatomía de la tarjeta de kanban

Padding 12px, borde 1px `--border`, fondo `--surface`, radio 10px. De arriba
hacia abajo:

1. **Fila superior:** chip del tipo de tarea a la izquierda, chip de prioridad a
   la derecha.
2. **Título:** `title-card`, máximo dos líneas, corte con elipsis.
3. **Proyecto:** una línea `meta` en `--ink-soft`. Se oculta cuando el tablero
   ya está filtrado a un solo proyecto, para no repetir lo obvio.
4. **Fila inferior:** a la izquierda `Calendar` de 14px más la fecha en formato
   `14 de septiembre`; a la derecha, cuando aplique, `MessageSquare` con el
   número de comentarios y `Paperclip` con el de adjuntos.

Sin cadenas de metadatos unidas con puntos medios: cada dato ocupa su lugar en
la retícula.

**Estados:**

- *Reposo:* como arriba.
- *Hover:* `--border` pasa a `--border-strong`. Sin desplazamiento ni sombra.
- *Vencida:* filete izquierdo de 2px en `--ink`, fecha en `--ink` peso 600 con
  `AlertTriangle`.
- *Arrastrando:* la tarjeta que flota lleva `--shadow-drag` y `scale(1.02)`; el
  hueco de origen queda como marco punteado de 1px sin contenido.
- *Solo lectura (portal del cliente):* idéntica, sin `cursor: grab`.

---

## 6. Sidebar

| Medida | Valor |
|---|---|
| Ancho expandido | 264px (redimensionable 220–360px, persistido) |
| Ancho colapsado | 56px |
| Fondo | `--surface-sunken` |
| Ítem | alto 32px, padding lateral 8px, radio 8px, icono 16px, separación 8px |
| Indentación de proyectos | 28px, alineados bajo el texto del cliente |
| Guía de anidado | línea de 1px en `--border` a la izquierda del grupo |

- **Cliente activo:** fondo `--surface`, texto `--ink` peso 550 y barra vertical
  de 2px en `--ink` pegada al borde izquierdo del ítem.
- **Proyecto activo:** fondo `--surface`, texto `--ink` peso 500, **sin** barra;
  la guía de anidado se tiñe de `--ink` a la altura del proyecto. Distinto
  tratamiento a propósito: cliente y proyecto no se confunden.
- **Disclosure:** `ChevronRight` de 14px que gira 90° al abrir, 160ms.
- **Buscador:** arriba de la lista, alto 32px, con la pista `Ctrl/Cmd + K`
  alineada a la derecha en `--ink-faint`.
- **Colapsado:** solo iconos, con tooltip al pasar el cursor.

---

## 7. Iconografía

**Lucide**, una sola familia. Grosor de trazo **1.5** (el 2 por defecto pesa
demasiado en una interfaz monocroma y densa). Tamaños: 16px estándar, 14px
dentro de chips y metadatos, 18px en el sidebar.

---

## 8. Foco, movimiento y accesibilidad

- **Foco:** contorno de 2px en `--ink` con desplazamiento de 2px. Visible en
  todo control interactivo, incluidas las tarjetas del kanban.
- **Movimiento:** 120ms en hover y pulsación, 160ms en disclosure, 200ms en
  overlays. Curva `cubic-bezier(0.2, 0, 0, 1)`. Nada de entradas animadas por
  sección. Con `prefers-reduced-motion: reduce` todas las duraciones pasan a 0.
- **Contraste:** todos los pares de texto sobre fondo cumplen 4.5:1 como mínimo.
- **Modo claro y oscuro:** se cambia con un interruptor en la barra superior,
  arranca siguiendo la preferencia del sistema y se recuerda en `localStorage`.

---

## 9. Dónde vive cada cosa

| Token | Archivo |
|---|---|
| Color, tipografía, radios, sombras, movimiento | `src/app/globals.css` |
| Columnas, prioridades, formato de fecha | `src/lib/dominio.ts` |
| Glifos de estado, chips, tarjeta de kanban, estado vacío, mensaje de error | `src/components/dominio/` |
| Catálogo visual | `src/app/estilo/` |

El puente con shadcn está en el bloque `@theme inline`: `--color-primary`
apunta a `--ink`, `--color-muted` a `--surface-sunken`, y así. Cambiar un token
en `:root` recorre todos los componentes sin tocar ninguno.

Queda pendiente de la sección 6.3 lo que solo se puede afinar con el sidebar
construido: el tratamiento del ítem activo contra el desplegable abierto se
verifica en la Fase 3.
