# portal

CRM y gestor de proyectos para trabajo subcontratado por agencias.

La jerarquía es `organizaciones (agencias) → clientes finales → proyectos →
tareas`, y el requisito que manda sobre todo lo demás es que **los datos de un
cliente nunca toquen los de otro**. Eso no se resuelve en la aplicación: se
resuelve con Row Level Security en Postgres, de modo que aunque una consulta
esté mal escrita la base no devuelve filas ajenas.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript estricto
- Tailwind v4 (CSS-first, sin `tailwind.config.ts`) · shadcn/ui
- Supabase self-hosted en Dokploy: PostgreSQL 17, GoTrue, Storage, Realtime
- n8n para el correo transaccional

## Requisitos

- Node 22
- Una instancia de Supabase con las migraciones de `supabase/migrations`
  aplicadas en orden

## Arranque local

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run dev
```

Para crear el primer administrador:

```bash
node scripts/crear-admin.mjs
```

### Compilar sin apagar el servidor de desarrollo

`next dev` y `next build` escriben los dos en `.next` y se pisan. Por eso
`next.config.ts` respeta `NEXT_DIST_DIR`:

```bash
NEXT_DIST_DIR=.next-build npm run build
```

## Variables de entorno

**La distinción importa.** Next.js sustituye las `NEXT_PUBLIC_*` por su valor
literal *durante la compilación* y las incrusta en el JavaScript que baja el
navegador. Ponerlas solo en el entorno de ejecución no tiene efecto: el bundle
ya está compilado. Además `src/lib/env.ts` valida la URL de Supabase al
importarse, así que sin ellas el build ni siquiera termina.

| Variable | Cuándo se necesita | Secreta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **compilación** | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **compilación** | no (la protege RLS) |
| `NEXT_PUBLIC_APP_URL` | **compilación** | no |
| `SUPABASE_SERVICE_ROLE_KEY` | ejecución | **sí — se salta RLS por completo** |
| `CRM_ENCRYPTION_KEY` | ejecución | **sí** — 32 bytes en base64 |
| `N8N_WEBHOOK_URL` | ejecución | no |
| `N8N_WEBHOOK_SECRET` | ejecución | **sí** |

`CRM_ENCRYPTION_KEY` cifra la API key del LLM con AES-256-GCM. **Respáldala
fuera de la base**: si se pierde, la llave guardada es irrecuperable.

## Migraciones

Se aplican en orden y **no se modifican una vez aplicadas**. Cada cambio va en
un archivo nuevo.

| | Qué hace |
|---|---|
| `001` | Esquema inicial: 17 tablas, RLS en todas, vista `v_board_tasks`, disparadores |
| `002` | Tipos de tarea, ajustes de LLM, notificaciones |
| `003` | Revoca `EXECUTE` de `build_task_payload` y de las funciones de disparador |
| `004` | `guard_profile_update`: impide que un usuario se ascienda a `platform_admin` |
| `005` | Arregla el listado de storage y afina el rendimiento de las políticas |

## Pruebas de aislamiento

```bash
node scripts/pruebas-aislamiento.mjs
```

Catorce pruebas que abren **sesiones reales con la llave anon**. Nunca uses
`service_role` para correrlas: esa llave se salta RLS y todas pasarían en
falso.

## Despliegue (Dokploy)

La aplicación se construye con el `Dockerfile` del repositorio —salida
`standalone` de Next.js, imagen final sin código fuente ni dependencias de
compilación— y escucha en el puerto **3000**.

En la aplicación de Dokploy:

1. **Build Type:** `Dockerfile`.
2. **Build Args** — aquí van las tres `NEXT_PUBLIC_*`. No en Environment.
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_APP_URL=https://portal.halonso.digital
   ```
3. **Environment** — las de ejecución:
   ```
   SUPABASE_SERVICE_ROLE_KEY=...
   CRM_ENCRYPTION_KEY=...
   N8N_WEBHOOK_URL=...
   N8N_WEBHOOK_SECRET=...
   ```

Si el build falla con un `ZodError` sobre `NEXT_PUBLIC_SUPABASE_URL`, es que
las pusiste en Environment en vez de en Build Args. El Dockerfile comprueba
esto antes de compilar y lo dice con todas sus letras.

## Documentación

- [`AGENTS.md`](AGENTS.md) — la especificación del sistema y las reglas de
  trabajo sobre el repositorio
- [`docs/DESIGN_TOKENS.md`](docs/DESIGN_TOKENS.md) — la escala tipográfica, los
  radios y los tokens de color
- [`docs/INVESTIGACION.md`](docs/INVESTIGACION.md) — investigación de mercado,
  la parte fiscal y legal para México, y las mediciones de RLS, Realtime y
  respaldos
