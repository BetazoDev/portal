# =============================================================================
#  Imagen de producción del CRM.
#
#  Tres etapas para que la imagen final no lleve ni el código fuente ni las
#  dependencias de compilación: solo el bundle de Next.js y lo que necesita
#  para arrancar.
#
#  IMPORTANTE — las variables NEXT_PUBLIC_* van como ARG, no como env de
#  ejecución. Next.js las sustituye por su valor literal DURANTE el build y
#  las incrusta en el JavaScript que baja el navegador; ponerlas solo en
#  runtime no tiene ningún efecto. Además src/lib/env.ts valida la URL de
#  Supabase al importarse, así que sin ellas el build falla y no arranca
#  siquiera. En Dokploy se cargan en "Build Args", no en "Environment".
#
#  La service_role y la llave de cifrado NO van aquí: se leen en ejecución
#  desde el entorno del contenedor, y así no quedan en ninguna capa de la
#  imagen ni en el historial de build.
# =============================================================================

FROM node:22-alpine AS base
# libc6-compat: algunos binarios nativos de npm asumen glibc y Alpine usa musl.
RUN apk add --no-cache libc6-compat
WORKDIR /app


# --- dependencias ------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
# npm ci respeta el lockfile al pie de la letra. Nunca uses npm install aquí:
# resolvería versiones nuevas y la imagen dejaría de ser reproducible.
RUN npm ci


# --- compilación -------------------------------------------------------------
FROM base AS builder

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Falla temprano y con un mensaje entendible. Sin esto, el error que sale es
# un ZodError en medio del log del build y cuesta media hora entenderlo.
RUN if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then \
      echo ""; \
      echo "ERROR: faltan build args."; \
      echo "NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben ir en"; \
      echo "Build Args (no en Environment): Next.js las incrusta al compilar."; \
      echo ""; \
      exit 1; \
    fi

RUN npm run build


# --- ejecución ---------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Sin esto Next escucha en localhost y Traefik no lo alcanza desde fuera
# del contenedor.
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
# El servidor standalone trae su propio node_modules recortado y su server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
