# Investigación de mercado, de operación y de riesgos

Septiembre de 2026.

Este documento contesta cuatro cosas: qué existe allá afuera que haga lo que
estamos haciendo, por qué la mayoría de esos productos no se usan, qué le falta
a lo que llevamos construido, y qué hay que resolver para cobrarle legalmente a
una agencia mexicana.

**Cómo leerlo.** Lo que dice *medido* lo comprobé contra tu base de datos o
contra tu sistema corriendo, y va con el número. Lo que dice *según* viene de
investigación externa y lleva enlace. Lo que no se pudo confirmar está marcado
como tal, sin excepción. Los precios están en dólares salvo indicación, son de
septiembre de 2026, y caducan rápido.

> **La sección 6 no es asesoría fiscal ni legal.** Está construida sobre lectura
> directa del texto de las leyes, pero no la escribió un contador ni un abogado.
> Antes de decidir régimen fiscal o de firmar un contrato marco, verifícalo con
> un contador público titulado y un abogado. Ahí te digo exactamente qué
> preguntarles.

---

## 1. Son cuatro mercados, no uno

Casi todas las comparativas que vas a encontrar mezclan categorías que cobran de
formas incompatibles. Separarlas es lo que hace legible el resto.

| Categoría | Qué venden | Cómo cobran | Ejemplos |
|---|---|---|---|
| **Entrega productizada** | Una cola de trabajo repetido | Plano + asiento interno | Wayfront, ManyRequests, Zendo, AgencyHandy, Queue |
| **Portal marca blanca** | Un contenedor con tu marca | Por **contacto activo** o plano | Assembly, SuiteDash, Ahsuite, SuperOkay, TaskIP, Sydnee |
| **Suite freelance** | CRM + propuesta + contrato + factura | Por **asiento** | Bonsai, Dubsado, HoneyBook, Moxie, Plutio |
| **Revisión y aprobación** | Que el cliente opine sobre un archivo o un sitio | Por asiento **interno**; revisores externos **gratis** | Filestage, Ziflow, BugHerd, MarkUp.io |

La cuarta es la que casi nadie compara y **es la única cuya economía está
alineada con tu problema**: cobra por ti, no por tus clientes, y no obliga al
cliente a crear cuenta.

### 1.1 Entrega productizada — el vecindario más cercano

| | Precio para un operador | Primitiva | Cola / WIP | SLA calculado | Aprobación con registro |
|---|---|---|---|---|---|
| **Wayfront** (ex SPP) | $99–129/mes | `order` | vista de capacidad | reajusta fechas si el brief llega tarde | ❌ |
| **ManyRequests** | $39–59/mes | `request` | ✅ **máx. concurrentes + cola que el cliente reordena** | ❌ | proofing, sin firma |
| **Zendo** | $25–79/mes | `order` | ❌ | solo fechas límite | solo cotizaciones |
| **AgencyHandy** | $29–99/mes | `order` + `task` | ❌ | "delivery time" como texto | ✅ "Client Review Required" |
| **Queue** | gratis → $49/mes | `request` | ✅ **límite por columna + créditos** | ❌ | ❌ |
| **Assembly** (ex Copilot) | $49–599/mes | `client` | ❌ | ❌ | firma de contratos |

Dos renombres que rompen las reseñas viejas: **Service Provider Pro es Wayfront
desde el 16-feb-2026**, y **Copilot es Assembly desde el 30-sep-2025**
(`copilot.app` redirige 301). Si tenías "Copilot a $39/usuario" en la cabeza,
esa referencia está muerta: ahora cobra por **contactos activos** y créditos.

### 1.2 Portales marca blanca

| Producto | Planes (USD/mes) | Cobra por | White-label nivel 3 desde |
|---|---|---|---|
| **SuiteDash** | $19 / $49 / $99 | **Plano, clientes ilimitados** | **$19** — el plan de entrada |
| **Sydnee** | $29.99 / $79.99 / $199.99 anual | Asientos | **$29.99, todos los planes** |
| **Ahsuite** | Free / $8 / $17 / $29 | Plano | **$29** |
| **Moxie** | $10 / $20 / $32 anual | **Plano** | **$20–25** |
| **TaskIP** | $12 / $29 / $59 / $89 | Asientos, clientes ilimitados | **$59** |
| **SuperOkay** | $12 / $38 / $146 mensual | Clientes | $38 |
| **Assembly** | Free / **$49** / **$139** / **$599** | **Contactos activos** | **$139** |
| **Clinked** | $11/usuario / $239 / $599 | Miembros | **$599** |

*(Nivel 3 = dominio propio + correo saliente desde tu dominio + cero rastro del
proveedor. Nivel 1 es solo logo y colores.)*

**Lo que hay que saber de cada uno antes de considerarlo:**

- **SuiteDash** parece imbatible a $19 —white-label completo, SMTP propio con
  SPF/DKIM/DMARC, clientes ilimitados, 0 % de comisión, soporta MXN— hasta que
  lees el techo de su API: **400 llamadas al mes** en el plan de entrada, 2,000
  en el de $49. Cualquier automatización seria te empuja a $49–99. Y su
  Trustpilot es **2.7/5** con quejas de lentitud, contra 4.8/5 en Capterra.
- **Assembly** es el más pulido y **el más caro de verdad**: además de su plan,
  **se lleva de +0.3 % a +1.1 % encima de Stripe**, la comisión por método de
  facturación **no se puede repercutir al cliente**, y **es merchant of record**
  —*"money first flows to us"*, y en un contracargo perdido *"the funds will not
  be returned"*. Caso México, plan Starter, tarjeta internacional con
  suscripción: ≈ **6.3 % + $0.30** de cada cobro. Descartado.
- **Ahsuite** tiene el mejor manejo de entregables del informe: cada archivo es
  un **contenedor**, la última subida es el "active file", y el enlace externo
  siempre resuelve a la versión activa. Pero **no tiene API entrante, solo
  webhooks de salida** —*"Ahsuite does not receive data"*—, así que no puedes
  automatizar el alta de clientes.
- **SuperOkay**: sin pagos, sin API, sin webhooks, sin e-firma real, y **ninguna
  actualización publicada desde septiembre de 2025**. Descartado por riesgo de
  abandono.
- **Moxie** es el mejor white-label por precio ($20–25 con dominio por CNAME,
  SMTP propio, magic link y aprobación de entregables nativa) pero **cambió de
  CEO el 8-jun-2026** y el fundador reconoció desaceleración del producto.

### 1.3 Suites freelance — y por qué ninguna te sirve

**HoneyBook está descalificado de entrada: no opera en México.** *"available for
business owners in the U.S., Canada, UK and Australia"*. Se expandió a Reino
Unido y Australia en mayo de 2026 y **sigue sin cubrir Latinoamérica.** Además,
en **septiembre de 2026 eliminó el time tracking sin aviso**; hay reportes en
Trustpilot de gente que perdió el histórico de horas registradas.

**Bonsai ahora es de Zoom.** Sus quejas públicas no son de UX, son de dinero:
*"They cut my Stripe connection without notice"* (feb-2026), *"Almost $20K in
invoices floating in the ether"* (sep-2025). Y cobra **+1 % encima de tu propio
Stripe**. Su plan barato excluye facturación, pagos, propuestas, contratos y el
portal: el piso real es **$19–25 por asiento**.

**Dubsado es el único con soporte de pagos nativo documentado en México** —
tarjeta mexicana **3.6 % + MXN$3.00**, sin markup propio. Pero **subió 75 % el
1-dic-2025** ($20→$35) y su portal **no le muestra al cliente el estado del
proyecto**: es un archivero con caja, no un tablero. Y exige **contraseña
obligatoria**, justo el antipatrón de la sección 3.

**Plutio: cero entradas de changelog en doce meses.** Última el 2-sep-2025,
cuando antes publicaba cada 2–5 días. Evítalo.

### 1.4 Revisión y aprobación — aquí el mercado te gana

| Producto | Precio | Revisores externos | Versiones |
|---|---|---|---|
| **Ziflow** | **Free** / $199 / $329 | **Ilimitados, sin login, en todos** | **Ilimitadas + comparación píxel a píxel en todos** |
| **BugHerd** | $50 / $80 / $150 | **Ilimitados, gratis** | — |
| **Filestage** | Free / $199 / $329 | **Ilimitados, sin cuenta** | Compare básico en todos |

**Ziflow Personal es gratis, con versiones ilimitadas y comparación píxel a
píxel.** BugHerd son $50 y anota sobre el staging con invitados ilimitados. Esta
es la única categoría donde comprar es estrictamente mejor que construir.

---

## 2. El hueco: dónde no llega ninguno

Cruzar los changelogs de los últimos doce meses deja un patrón muy claro.

**Todos se fueron a la IA y abandonaron la mecánica de entrega.** En un año
salieron cuatro servidores MCP —Wayfront en febrero, AgencyHandy y Assembly en
julio, ManyRequests el 1 de septiembre— y dos CLIs. En ese mismo periodo, en el
changelog del líder de la categoría: **cero releases sobre SLA, cero sobre
aprobaciones con registro, cero sobre límites de trabajo en curso**. El MCP ya es
paridad, no diferenciación. La mecánica de entrega sigue vacía.

**Nadie registra quién aprobó qué y cuándo.** Hay anotación sobre archivos y
firma de propuestas. No hay **un solo producto** con un registro formal de
aceptación del entregable ni con contador de revisiones incluidas contra
consumidas. Para quien subcontrata con agencias, ése es exactamente el punto
donde se pierde dinero.

**Versionado de archivos: solo Ahsuite.** Y no se puede automatizar.

**La queja número uno del líder es estructural.** De una reseña de Capterra de
mayo de 2025 sobre Wayfront: las conversaciones quedan aisladas dentro de cada
orden y es difícil tener una vista clara. Es consecuencia directa de que su
primitiva sea la `order`. **Tú no heredas ese problema**: tienes
`organizations → end_clients → projects → tasks` como objetos de primer nivel.

**Y ese último punto es tu foso.** Solo Wayfront tiene algo para la relación de
tres partes —su "portal de revendedor"—, sin documentación pública. **Ningún
producto de este informe modela los clientes de tu cliente.** Todos manejan una
lista plana. Tus agencias necesitan enseñarle el portal a *su* cliente. Ésa es
la razón legítima para no comprar.

---

## 3. Por qué los portales fracasan — la sección que cambia el plan

Esto es lo más importante del documento y es incómodo, porque dos de las causas
documentadas apuntan directo a cosas que ya construimos.

### 3.1 Los números

**Beyond Encryption / Mailock, 1,000 adultos del Reino Unido, marzo 2024:**

- **Solo el 7 %** prefiere recibir documentos por portal en vez de por correo.
- **72 %** se ha frustrado creando una cuenta que usaría **una sola vez**.
- **43 %** dice que gestionar logins afecta su disposición a usar servicios online.
- El consumidor promedio carga **119 credenciales**.

**Accomplish, 22 gestoras de activos, 87 % con portal:**

- **45 %** aplicó una estrategia deliberada de adopción → **100 % de adopción**.
- **55 %** no la aplicó → **23 % promedio**, y varias en **0 %**.

**Caso documentado con costos** (Digital Sage): 60 % creó cuenta el primer mes,
**solo el 30 % entró más de una vez**. Coste del primer año: **$32,900**. El
portal **aumentó** las llamadas telefónicas.

**Benchmarks para juzgarte a ti mismo** (customer-portals.com): activación
**60–80 % a los 90 días** —por debajo de 50 % hay un problema—, uso mensual
**30–50 %** de los registrados, primer login **70 %+ en 7 días**.

### 3.2 Las causas, y las dos que ya tenemos encima

1. **El portal no compite con el correo: compite con dónde está el cliente
   cuando surge el problema.** CloudRadial lo dice sin anestesia: pedirle que
   abra el navegador *"is asking them to interrupt that workflow entirely"*.
2. 🔴 **Fricción de cuenta.** Crear cuenta obligatoria reduce la conversión
   **20–30 %**. **Nuestro onboarding es exactamente el antipatrón**: generamos
   contraseña temporal de 16 caracteres, la mandamos por n8n, y
   `must_change_password` fuerza el cambio. Verificado en el código: **solo
   existe `signInWithPassword`**, no hay magic link ni OTP. Todo el mercado
   —Assembly, Moxie, HoneyBook, Softr, Sydnee— ya migró a magic link. El único
   que no lo hizo, Dubsado, es también el único cuyo portal la gente no usa.
3. 🔴 **Notificación como ruido en vez de señal.** *"A notification that fires
   because the CPA just moved a task forward is noise. A notification that fires
   because the client's document request is still pending after 72 hours is
   signal."* **Verificado en `n8n/crm-eventos.workflow.js`: mandamos correo al
   cliente en `task.created`, `task.updated` y `comment.created`.** Cada
   movimiento nuestro le llega. Eso entrena al cliente a ignorar el buzón.
4. **Datos rancios.** Causa nº3 de abandono. **Aquí estamos blindados**: el
   portal lee la misma base que el tablero, no hay sincronización que se olvide.
5. **Aprobaciones desconectadas.** El círculo vicioso exacto: *"you upload the
   document, the client downloads it, they reply by email, you mark something
   manually"* — **el correo ya ganó dentro de tu propio portal**.
6. **Sin razón recurrente para volver.** Tras el alta no hay motivo.
7. **La métrica está mal.** Juzgar por visitas *"guarantees it looks like a
   failure even when it's quietly doing its job"*. Mide **acciones completadas**
   —aprobaciones, briefs contestados, pagos—, no logins.

### 3.3 Qué hicieron los que sí lo resolvieron

- **Login sin contraseña.** *"No account creation. No password to remember. No
  password reset flows."*
- **Onboarding automatizado con cadencia**: ocho toques en los primeros 60 días
  llevan la adopción de 35–50 % a **75–82 %**. *"The system does the chasing."*
- **Peticiones específicas, no carpetas vacías.** *"Please upload your 2025 W-2
  from Employer Name"* funciona; "sube tus documentos" no.
- **Nudges por inacción del cliente a 72 h**, no por movimiento tuyo.
- **Meterse en el canal del cliente** en lugar de pelear contra él.
- **Diseñar para el administrador del lado del cliente**, que tiene autoridad
  sobre su propia gente. En tu caso: el dueño de la agencia, no el ejecutivo.
- **Mantener el correo y el teléfono abiertos.** No fuerces la adopción.

### 3.4 El patrón email-first, con implementación

**Basecamp es la referencia y lo documenta oficialmente:** *"You can stay
involved without logging in every time by replying to Basecamp notifications
directly from your email. Your response will appear in the right place in the
project automatically."*

Y el fallo que hay que superar, **documentado por ellos mismos**: *"Email
notifications are meant to be replied to directly, not forwarded. If you're
CCing others, **their** replies won't make it into Basecamp."* Mapea por token
del destinatario, y **las agencias hacen CC a media oficina**.

**Referencias técnicas que conviene copiar:** GitLab usa
`incoming+%{key}@example.com` con sub-addressing y caduca a 2 años; Discourse
usa `replies+%{reply_key}@`; GitHub descarta adjuntos y limita a 65,530
caracteres. **Linear no tiene email-in. Notion tampoco.**

**Servicios de correo entrante:**

| Servicio | Precio | Entrega | Adjuntos |
|---|---|---|---|
| **Cloudflare Email Routing + Workers** | **Gratis** | handler `email()` | ≤25 MiB |
| **Resend** | **Free** (3,000/mes) | webhook POST | metadata + URL temporal |
| **Postmark** | **$16.50** (inbound solo en Pro) | webhook JSON | ≤35 MB |
| **SendGrid** | incluido en envío | multipart | ≤30 MB |

🔴 **La trampa que te habría costado un día:** el `StrippedTextReply` de Postmark
—lo que separa la respuesta nueva del texto citado— **solo funciona en inglés**.
Tus clientes escriben en español. La librería correcta es
[`crisp-oss/email-reply-parser`](https://github.com/crisp-oss/email-reply-parser):
MIT, Node, **~10 idiomas incluido español**, y procesa **un millón de correos
diarios** en producción en Crisp.

**Y el detalle que parece retro y es el único método determinista:** el marcador
`--- Responde ARRIBA DE ESTA LÍNEA ---`. Las heurísticas fallan; el corte por
marcador no. Basecamp lleva veinte años poniéndolo por una razón.

**Diseño de la dirección de respuesta:** `responder+<token>@respuestas.tudominio.com`
con **token HMAC firmado y con caducidad**, nunca un id secuencial —uno
adivinable deja que cualquiera publique suplantando a tu cliente. Guarda el
`Message-ID` de cada notificación que envíes: es lo único que rescata las
respuestas de terceros en CC, el fallo que Basecamp no resuelve. Usa
**subdominios separados** para envío y para entrada, y **nunca pongas el MX de
ingesta en el dominio raíz** o rompes tu propio correo.

---

## 4. Lo que vale la pena construir, en orden

Ordenado por retorno sobre esfuerzo, considerando lo que ya existe en la base.

### 4.1 Magic link 🔴

Una tarde de trabajo y elimina el antipatrón nº1 documentado.
`supabase.auth.admin.generateLink({ type: 'magiclink', email })` en un Route
Handler con `service_role`, y el enlace sale por el pipeline de n8n que ya
tienes. **No necesitas SMTP en Supabase.** Deja la contraseña como respaldo, no
como puerta. Caduca a 1 hora por defecto, cooldown de 60 s; el **OTP de 6
dígitos es más robusto para agencias** porque sobrevive a los escáneres
corporativos de enlaces.

### 4.2 Correo entrante → comentario 🔴

`email_log` solo registra salida. **Cada respuesta de una agencia a nuestras
notificaciones se pierde en tu bandeja.** Cloudflare Workers ($0) o Postmark
Pro ($16.50) → tabla `inbound_emails` → insert en `comments`, que ya existe con
RLS. Es conectar cañería, y es lo que más cambia el día a día.

### 4.3 Notificar por inacción, no por movimiento 🔴

No mandes correo en cada `task.updated`. Manda uno cuando la tarea lleva **72 h
en `esperando_cliente`**. Tu estado ya existe: es el gancho perfecto.

### 4.4 Aprobación explícita con registro y contador de revisiones

Tu mayor palanca, y casi gratis: **ya tienes `task_events`**. Faltan eventos
`aprobacion_solicitada` / `aprobado` / `cambios_pedidos` con `actor_id` y
`created_at`, y en `tasks` un `revisiones_incluidas` heredado del tipo contra
`revisiones_usadas`. Cuando el contador se agota, la siguiente petición nace
como tarea nueva, no como revisión.

**Y el remate: aprobar desde el correo, de un clic, sin login**, con token HMAC.
Eso cierra el círculo vicioso de 3.2.5 y es literalmente lo que Moxie vende.

### 4.5 SLA con reloj que se pausa

Ya tienes `task_types.expected_days` y `tasks.due_date`, y **nada los conecta**:
hoy `expected_days` solo sugiere una fecha en el formulario.

Copia la regla de Wayfront —brief tarde empuja las fechas— **y llévala más lejos
con la mecánica de los service desks**: en Zendesk la métrica **se pausa cuando
el ticket queda a la espera del cliente**. Tu columna `esperando_cliente` **no
debería consumir SLA**. Con agencias que entregan briefs tarde, eso deja de ser
una función y pasa a ser tu defensa contractual.

Campos: `sla_vence_en`, `esperando_desde`, `sla_pausado_ms`. Y visible en el
portal, que es donde surte efecto.

### 4.6 Captura estructurada por tipo de tarea

Hoy el cliente escribe texto libre y tú acabas preguntando la URL, los accesos,
el navegador. **El formulario de captura debe ser el brief.**

El hueco de mercado dimensiona la oportunidad: **Zendo cobra $79–99/mes por la
lógica condicional**, **AgencyHandy la tiene "en pruebas" desde julio de 2024**
—más de dos años—, y **Assembly no la tiene**, al punto de que su documentación
recomienda incrustar Typeform.

En tu esquema: `task_types.esquema_captura jsonb` y `tasks.datos_captura jsonb`.

### 4.7 Entregables con versión, modelo contenedor

**Cópiale a Ahsuite** en vez de inventar: `deliverables` como contenedor estable
+ `deliverable_versions (version_no, storage_path)`, y que la URL firmada
resuelva siempre a la versión activa. Tu `attachments` ya tiene `storage_path`;
es una migración.

### 4.8 Límite de trabajo en curso por cliente

Tu riesgo operativo real es que una agencia te tire veinte tareas el lunes.
Ninguna tabla lo impide hoy.

La mejor mecánica es la de ManyRequests: máximo de peticiones concurrentes; al
superarlo el cliente **puede seguir mandando pero entran a una cola**, y **él
mismo la reordena arrastrando**. El "no" lo da el sistema y la priorización es
problema de quien pide. Queue lo hace con créditos que **bloquean el alta**.

En tu esquema: `organizations.max_tareas_activas` y un estado `en_cola`.

### 4.9 Marca por agencia

`organizations` tiene `name, slug, status, contact_email, contact_phone, notes`.
No hay logo, ni color, ni dominio, ni remitente. **Si tus clientes son agencias
que te subcontratan, ellas necesitan enseñar el portal a *sus* clientes con *su*
marca.** Es la funcionalidad de mayor palanca comercial que falta.

### 4.10 Sub-usuarios y digest semanal

`memberships` y `pending_invitations` ya tienen roles, pero hoy solo tú das de
alta. Deja que el `client_owner` invite a los suyos.

Y `daily_briefs` es solo para ti: un **digest semanal al cliente** —lo entregado,
lo pendiente de su lado, el enlace de aprobación— reutiliza toda la
infraestructura de LLM que ya está cifrada y configurada. Es el patrón "el
portal es para ti, el correo es para él".

---

## 5. Lo que no vale la pena construir

| No hagas esto | Por qué |
|---|---|
| **Anotación sobre archivos y sitios** | **Ziflow Personal es gratis** con versiones ilimitadas y comparación píxel. BugHerd $50 con invitados ilimitados. No compitas con eso |
| **E-firma** | El valor está en la cadena probatoria (hash, IP, timestamp, NOM-151), no en el `<canvas>` |
| **Facturación CFDI propia** | Timbrar tú mismo son semanas y responsabilidad fiscal. Ver §6.3 |
| **Constructor de propuestas** | Es un WYSIWYG con plantillas. Meses de trabajo, cero diferenciación |
| **SSO / SAML** | Solo aparece en Enterprise. Tus clientes son agencias pequeñas: magic link es el estándar |
| **Helpdesk / ticketing** | El de Wayfront es su función peor valorada. Assembly ni lo tiene |
| **CRM con embudo** | Tus clientes ya son clientes |
| **Planeación de recursos** | No hay equipo |
| **Tu propio parser MIME y stripper de citas** | `postal-mime` + `crisp-oss/email-reply-parser` + marcador explícito |
| **App móvil white-label** | Un portal responsive cubre el 78 % que usa móvil |
| **Marketplace público** | No vendes al público |
| **Migrar a Notion + Softr** | Cambias RLS de Postgres por filtros de capa de aplicación. Softr, Notion y Airtable **no tienen RLS por usuario final**: un filtro mal puesto en una pantalla filtra datos entre agencias competidoras |
| **Perseguir "logins" como métrica** | Garantiza que parezca fracaso aunque funcione |

---

## 6. México: cómo cobrar sin meterte en problemas

Nada de esto lo resuelve ninguna herramienta extranjera del informe. Es tu
ventaja estructural y también tu tarea pendiente.

> Repito la advertencia: **esto es información, no asesoría.** Verifícalo con un
> contador y un abogado. Marco los puntos inciertos.

### 6.1 Retenciones — el punto que más te cambia el dinero

Aquí es donde más gente se equivoca. **La retención depende de cómo estés dado
de alta, no de qué hagas.**

- **ISR 10 %** — LISR art. 106, último párrafo. Dice **"servicios
  profesionales"**. No dice actividades empresariales.
- **IVA 2/3 = 10.6667 %** — LIVA art. 1o.-A fracc. II inciso a) + RLIVA art. 3.
  Aplica a **"servicios personales independientes"**. Y la llave está en el
  **LIVA art. 14, último párrafo**: es "personal" cuando **no tiene la
  naturaleza de actividad empresarial**.
- **ISR 1.25 %** — LISR art. 113-J, RESICO. Éste **sí abarca actividades
  empresariales**, a diferencia del 106. Límite RESICO PF: **$3,500,000**
  anuales, tasas de 1.00 % a 2.50 % sobre ingresos cobrados.

**El mismo trabajo, cuatro resultados.** Facturas $10,000 MXN a una agencia:

| Cómo estás dado de alta | IVA | Ret. ISR | Ret. IVA | **Te depositan** |
|---|---:|---:|---:|---:|
| Honorarios / servicios profesionales | +1,600 | −1,000 | −1,066.67 | **$9,533.33** |
| RESICO, servicio profesional | +1,600 | −125 | −1,066.67 | **$10,408.33** |
| RESICO, actividad empresarial | +1,600 | −125 | — | **$11,475.00** |
| Actividad empresarial, sin RESICO | +1,600 | — | — | **$11,600.00** |

**Un 21.7 % de diferencia en flujo de caja por la misma factura.** Las
retenciones son anticipos acreditables, no impuesto extra —pero el efecto de
caja para un freelance es enorme.

⚠️ **Esto es lo primero que debes preguntarle a tu contador**, porque la
clasificación *empresarial vs. profesional* del desarrollo de software a la
medida es tema de criterio y hay posturas encontradas. No lo decidas solo.

Dato útil: **LISR art. 106 permite a la agencia no emitir constancia de
retención** si tu CFDI señala el monto retenido. **Tu propia factura sirve como
comprobante** — no dependes de que te manden nada.

### 6.2 CFDI 4.0 — lo que cambió en 2026

**CFDI 4.0 sigue siendo la única versión válida.** No hay 5.0. Lo que cambia
constantemente son los catálogos: **no los hardcodees**, sincronízalos o delega
la validación al PAC.

Lo que sí cambió, leído del CFF vigente (última reforma DOF 09-04-2026):

- **Art. 29-A fracc. IX (nueva):** el CFDI debe *"amparar operaciones
  existentes, verdaderas o actos jurídicos reales"*, y los que no cumplan **"se
  consideran falsos para efectos de este Código"**. La operación simulada pasó
  de tema de fiscalización a **requisito de forma**.
- **Cancelación:** a más tardar en el mes de la declaración anual del ejercicio
  en que se expidió, **con aceptación del receptor**, y **hay que justificar y
  soportar documentalmente el motivo**.
- ⚠️ **Art. 30-B (nuevo):** quien preste *servicios digitales* debe dar al SAT
  **acceso en línea, permanente y en tiempo real**, bajo pena de **bloqueo del
  servicio**. **No te aplica** como desarrollador por encargo — **pero sí te
  alcanzaría si lanzas este CRM como SaaS de pago a terceros.** Tenlo presente
  antes de productizarlo.

**Claves de catálogo para lo que haces:**

| Clave | Para qué |
|---|---|
| `81111504` | **Servicios de programación de aplicaciones** — desarrollo a la medida |
| `81112103` | **Diseño de sitios web** |
| `81112200–81112222` | **Mantenimiento y soporte de software** — retainers |
| `81112105` | Hospedaje y operación de sitios |
| Unidad `E48` / `ACT` / `HUR` | Servicio / Actividad / Hora |

Y una advertencia del art. 29-A fracc. V que casi nadie conoce: si la
descripción del servicio en tus CFDI no coincide con **las actividades
económicas registradas en tu RFC**, la autoridad **actualiza de oficio** tu
régimen y obligaciones. Mantenlas alineadas.

**Antes de timbrar a una agencia:** pídele su Constancia de Situación Fiscal y
valida RFC, código postal y régimen. Los errores `CFDI40104` y `CFDI40105` son
la causa más común de rechazo y son 100 % evitables.

### 6.3 PACs — a tu volumen, la mensualidad lo domina todo

⚠️ **No se pudo verificar el padrón oficial del SAT** (504 persistente, y el
host real se sirve por HTTP plano). Todo estatus de "es PAC" abajo es
**auto-declarado**. Verifícalo antes de contratar:
<https://www.sat.gob.mx/aplicacion/30796/proveedor-de-certificacion-de-factura-electronica->

**Los PACs sí se revocan** —BBVA en feb-2022, seis más en abr-2022—. Si tu
proveedor es una capa sobre un PAC y ese PAC cae, tu facturación cae con él.
**Pregunta siempre qué PAC está detrás.**

Lo que define tu esfuerzo: **manda JSON, no XML.** Armar el XML, la cadena
original con XSLT y el sellado con el `.key` es el 80 % del dolor.

| Proveedor | Fijo | Por timbre | ¿Caducan? | SDK Node | Tipos TS |
|---|---|---|---|---|---|
| **Facturama** | **$1,650/año** (100 folios) | $0.50 | 🔴 **Sí, 1 año** | ✅ | ❌ |
| **Facturapi** | $299/mes (**$3,588/año**) | $0.60 | No | ✅ | ✅ **sí** |
| **Factura Digital** | **$0** | $1.20–$12 | No | ❌ | ❌ |
| **FiscalAPI** | $199/mes | por paquete | No | ✅ | ❓ |
| **SW sapien** (PAC directo) | cotizar | cotizar | No | ✅ (may-2026) | ❌ |
| **Finkok** (PAC directo) | $150/mes | $0.30 | ❓ | ❌ **SOAP** | ❌ |

**Costo real a ~20 documentos/mes:** Factura Digital ~$1,200/año · **Facturama
~$1,720** · Finkok ~$2,088 · **Facturapi ~$3,732**.

**El insight: el precio por timbre es irrelevante.** 240 timbres a $0.60 son
$144 al año. Facturapi cuesta **tres veces más que Factura Digital por la misma
cantidad de facturas** — toda la diferencia es mensualidad.

**Recomendación:** **Facturama** por costo/DX (JSON, SDK Node, sandbox sin
trámite, guía dedicada de complemento de pago), con el cuidado de **no comprar
paquetes grandes porque los folios caducan a 12 meses**. **Facturapi** solo si
vas a construir producto encima: es el único con **SDK TypeScript-first que
exporta sus tipos**, y eso vale sobre un modelo tan detallado como el CFDI.
**Descarta Finkok** (SOAP, sin SDK Node, exige XML pre-sellado: todo el dolor
que quieres evitar).

**Cinco notas de arquitectura para Next.js:**

1. Solo desde Route Handlers o Server Actions. La API key **jamás** en
   `NEXT_PUBLIC_*`.
2. `export const runtime = 'nodejs'` — los SDKs usan `crypto` de Node y truenan
   en Edge.
3. 🔴 **El timbrado no es idempotente.** Un timeout puede dejarte un CFDI
   timbrado que tu base no registró. **Persiste tu folio antes de llamar al
   PAC** y reconcilia después. Reintentos con backoff, nunca dentro del request.
4. **Encola.** Un timbre tarda 100–500 ms, pero durante incidentes del SAT se va
   a decenas de segundos.
5. **Guarda el XML, no solo el PDF.** El XML es el comprobante. Conservación: 5
   años fiscales (CFF 30) y **10 años mercantiles** (CCom 49).

Sobre el **CSD**: los proveedores lo guardan en su nube. **No es tu e.firma** —
solo puede sellar CFDI, no hacer trámites a tu nombre. Riesgo acotado pero real.

### 6.4 Complemento de pago (REP) — la regla que atrapa a todos

**CFF art. 29-A fracc. VII inciso b):** hay que emitir REP cuando el pago no sea
en una sola exhibición **o cuando, siéndolo, se realice de manera diferida**.

Ese segundo caso es el que atrapa a la mayoría: **emitir la factura hoy y cobrar
a 30 días es PPD**, aunque el pago sea uno solo.

**Plazo: el quinto día natural del mes siguiente** al del cobro. ⚠️ *La regla se
cita como 2.7.1.32 de la RMF 2026 en dos fuentes y otra la atribuye a otro
número; confírmalo con tu PAC, la numeración se recorre entre resoluciones.*

**Multas (CFF 84 fracc. IV, montos vigentes 2026):** no expedir CFDI, **$22,300
a $127,530** por comprobante (**$1,910 a $3,800** si estás en RESICO); CFDI
**sin el complemento** requerido, **$450 a $670** por comprobante.

| Cómo cobras | Método | ¿REP? |
|---|---|---|
| **Cobras y luego facturas** | `PUE` + `FormaPago=03` | ❌ **Cero complejidad** |
| Facturas y luego cobras (lo normal con agencias) | `PPD` + `FormaPago=99` | ✅ uno por pago |
| Proyecto a 3 pagos | `PPD` | ✅ tres, con `NumParcialidad` |

**Lo que el sistema necesitaría para PPD:** máquina de estados por factura con
saldo insoluto, **un job que corra los días 1–4 y emita los REP del mes
anterior** (el día 5 es límite duro), alerta si el día 3 quedan pagos sin REP, y
registro de conciliación con el UUID del REP resultante.

**Y la regla de negocio que te ahorra todo eso:** si puedes negociar con las
agencias **emitir la factura al recibir el pago**, eliminas el REP por completo.
Vale la pena pedirlo antes de escribir una línea de código.

### 6.5 Datos personales — la ley es nueva, de marzo de 2025

Esto no es una actualización menor: **hay una LFPDPPP completamente nueva,
publicada en el DOF el 20 de marzo de 2025**, que **abroga expresamente la de
2010**. Se expidió tras la reforma constitucional que **extinguió al INAI**.

**La autoridad ahora es la Secretaría Anticorrupción y Buen Gobierno**, no el
INAI ni "Transparencia para el Pueblo". Está en la definición misma de la ley.

**⚠️ Si copias una plantilla de aviso de privacidad de internet, casi seguro
está escrita para la ley de 2010.** Cambió la numeración y el catálogo de
infracciones.

**Punto jurídicamente incierto que hay que vigilar:** el Reglamento de 2011
sigue publicado como "texto vigente" y la nueva ley lo invoca, pero el decreto
de 2025 **no lo abrogó**. Lo razonable es tratarlo como vigente en lo que no
contradiga la ley nueva — pregúntaselo a un abogado.

**Tú eres las dos cosas.** *Responsable* de los datos de tus agencias, y
***encargado*** de los leads y formularios de los clientes de ellas. Como
encargado (Reglamento art. 50) debes tratar solo conforme a sus instrucciones,
guardar confidencialidad y **suprimir los datos al terminar la relación**. Y el
**art. 51 exige que esa relación conste por escrito**.

🔴 **Acción concreta: redacta un Anexo de Tratamiento de Datos (DPA) y anéxalo a
todo contrato con agencias.** Sin eso estás incumpliendo desde el día uno.

**Tres buenas noticias:**

1. **No existe registro obligatorio de bases de datos** ante ninguna autoridad
   para el sector privado. Nunca lo hubo y la ley nueva no lo introdujo.
2. **Mandar datos a Supabase, Vercel o AWS es *remisión*, no transferencia** —
   son encargados, no terceros (art. 35). No requiere consentimiento. Pero el
   Reglamento art. 52 exige que el proveedor transparente sus subcontrataciones
   y no se atribuya la propiedad de la información: **guarda sus DPA en una
   carpeta, eso *es* tu evidencia**.
3. **No hay requisito de localización en México.** Servidores en EE. UU. son
   legales.

**Aviso de privacidad — art. 15, seis elementos:** identidad y domicilio ·
datos tratados identificando los sensibles · finalidades distinguiendo las que
requieren consentimiento · medios para limitar uso o divulgación · mecanismos
para ejercer ARCO · procedimiento para comunicar cambios.

**Art. 16 fracc. II:** en formularios web va la **versión simplificada** con al
menos los cuatro primeros **+ enlace al aviso integral**. No basta el enlace
solo.

**Carga de la prueba del consentimiento recae en ti, siempre.** **Loguea**
timestamp, IP, versión del aviso y su hash.

**Derechos ARCO — art. 31:** responder en **20 días hábiles**, hacerlo efectivo
en **15 días** más, ampliable una sola vez. Gratuito (art. 34). Y el **art. 29
te obliga a designar una persona de datos personales**: aunque seas tú solo,
nómbrate y publica el contacto. **No existe derecho de portabilidad** en esta
ley, a diferencia del GDPR.

**Vulneraciones (arts. 19, 63–66):** hay que notificar **al titular, de forma
inmediata**, con cinco puntos mínimos: naturaleza, datos comprometidos,
recomendaciones, acciones correctivas y dónde saber más. 🔑 **Diferencia clave
con el GDPR: no hay obligación de notificar a la autoridad ni plazo de 72
horas.** La obligación es hacia la persona.

**Sanciones, con UMA 2026 ($117.31 diario):**

| Supuesto | En pesos |
|---|---|
| Infracciones art. 58 fracc. II–VII | **$11,731 a $18,769,600** |
| Infracciones fracc. VIII–XVIII | **$23,462 a $37,539,200** |
| Datos sensibles | **hasta el doble** |

La que más te toca es la **fracc. XI: "vulnerar la seguridad de bases de datos…
cuando resulte imputable al responsable"**, en el rango alto. Y hay **delito de
3 meses a 3 años** para quien, estando autorizado a tratar datos, **con ánimo de
lucro provoque una vulneración**.

Consuelo: el **art. 60** manda graduar por **capacidad económica**. Ser freelance
juega a tu favor.

**El checklist es literal — Reglamento art. 61, nueve acciones**, y su último
párrafo dice que debes **contar con una relación de esas medidas**. Es un
documento exigible: inventario de datos y sistemas · funciones de quien los
trata · análisis de riesgos · medidas aplicables · análisis de brecha · plan de
trabajo · auditorías · capacitación · registro de medios de almacenamiento.

**Lo que ya tienes bien:** RLS por organización —los leads del cliente A jamás
visibles para el B, que sería "acceso no autorizado" del art. 63 fracc. III—,
bucket privado con URL firmada, y bitácora inmutable. **Lo que falta:** bitácora
de accesos a datos personales, log de consentimiento, job de retención con
supresión previo bloqueo (art. 10), y el papeleo del art. 61.

### 6.6 Contratos, firma y propiedad intelectual

**La firma electrónica simple es válida.** Código de Comercio art. 89: produce
*"los mismos efectos jurídicos que la firma autógrafa, siendo admisible como
prueba en juicio"*. Art. 96: neutralidad tecnológica explícita. CCF art. 1834
bis dice lo mismo para lo civil.

La diferencia entre simple y avanzada **no es de validez, es de prueba** (art.
1298-A: se valora *"la fiabilidad del método"*). Con firma simple, si la
contraparte niega haber firmado, **tú tienes que demostrar la fiabilidad** —se
puede, con logs, IPs y correos, pero es trabajo pericial. Con avanzada, quien la
niegue tiene que demostrar que no es fiable.

**Por monto:**

| Valor | Qué usar |
|---|---|
| < $50,000 | DocuSign o PDF + correo. Guarda los correos con encabezados |
| $50,000 – $500,000 | **Mifiel o Weetrust: e.firma + Constancia NOM-151.** El costo es marginal frente al riesgo |
| > $500,000 o con IP crítica | Lo anterior **y** revisión de abogado |

La **e.firma del SAT sí se puede usar para contratos privados**, y Mifiel
construyó su producto exactamente sobre eso, añadiendo la **Constancia de
Conservación NOM-151** que da fecha cierta oponible a terceros. Es el estándar
de facto mexicano para contratos de peso. **Conserva todo 10 años** (CCom 49).

🔴 **Y ahora la trampa por defecto, que es lo más importante de esta sección.**

**Ley Federal del Derecho de Autor, art. 83:** *"**Salvo pacto en contrario**, la
persona… que comisione la producción de una obra… **gozará de la titularidad de
los derechos patrimoniales**"*.

**Por defecto, la agencia se queda con todo.** Si quieres reservarte tus
componentes reutilizables, tu boilerplate o tu librería interna, **tiene que
estar escrito**. No se negocia después.

Dos artículos a tu favor que casi nadie usa:

- **Art. 83 bis:** *"los términos del contrato deberán ser claros y precisos, en
  caso de duda, **prevalecerá la interpretación más favorable al autor**. El
  autor también está facultado para **elaborar su contrato** cuando se le
  solicite una obra por encargo."* **La ley te faculta expresamente a proponer
  tú el contrato.** Úsalo.
- **Art. 21:** los derechos morales son **inalienables e irrenunciables**.
  Conservas el derecho a ser reconocido como autor aunque el contrato diga otra
  cosa.

Y uno en contra que conviene saber: **art. 103** — a diferencia de las cesiones
normales, que caducan a los 5 años, **la cesión de derechos sobre software no
está sujeta a limitación alguna**. Una cesión de código es **para siempre**.

**Cláusulas mínimas de tu contrato marco:** objeto con criterios de aceptación y
plazo de revisión ("se tienen por aceptados si no hay observaciones en 10 días
hábiles") · **cesión condicionada al pago total con reserva expresa de tus
librerías** · declaración de no relación laboral · confidencialidad bilateral ·
**el DPA de §6.5** · desglose de subtotal, IVA y retenciones diciendo si el
precio es antes o después · método PUE/PPD acordado y obligación de aceptar
cancelaciones en 3 días · tope de responsabilidad al monto del contrato ·
terminación con obligación de **suprimir datos** · **jurisdicción en tu ciudad**
—es la cláusula más barata de negociar y de las que más valen.

**Riesgo de recaracterización laboral** (LFT arts. 20 y 21): el elemento
decisivo es la **subordinación**. Señales de alarma: un solo cliente que es el
100 % de tus ingresos, horario impuesto, equipo proporcionado por la agencia,
reportar a un jefe, aparecer en su organigrama. Mitigación: diversifica, usa tu
equipo, factura por entregables y no por horas-persona, y ten el contrato
firmado **antes** de empezar. *(Sobre REPSE: la lectura es que un freelance sin
trabajadores propios no está obligado a registrarse, pero **no se verificó con
fuente primaria** — si una agencia te lo exige, pregúntale a un abogado
laboral.)*

---

## 7. Tu negocio: el nicho, con números

Tu situación exacta —desarrollador en Aguascalientes, clientes que son agencias—
tiene un mercado con precios públicos.

**GoWP** es el más copiable. Su definición de trabajo es la mejor escrita del
nicho: **una edición de contenido es cualquier cosa que se resuelva en 30
minutos o menos**. Si excede, cotizan **al dueño de la agencia, nunca al cliente
final**. Cobran $39/mes por sitio, $99/mes con ediciones incluidas, $1,299/mes
por desarrollador dedicado. Y **reciben todo el trabajo por correo a un buzón
con el dominio de la agencia**, rechazando explícitamente el reenvío automático.

**E2M** vende bolsas de horas ($1,299/mes por 30–35 h) y **trabaja dentro de la
herramienta del cliente**, sin imponer portal. **Work Hero** tiene el SLA más
honesto para un operador solo: urgente el mismo día, baja 1–3 días, media hasta
7, alta hasta 14; y sus horas **no se acumulan**.

| Concepto | Rango |
|---|---|
| Tarifa por hora, **LatAm nearshore** | **$75–100/h** |
| Europa del Este | $65–90/h |
| US/UK | $110–150/h |
| Care plan, costo para la agencia | $150–800/mes |
| Care plan, reventa de la agencia | $400–1,500/mes |
| **Margen bruto que reportan las agencias** | **50–75 %** |
| Retainer fijo | $499–2,000/mes |
| Desarrollador dedicado | $3,000–6,000/mes |

**Tu ventaja estructural no es el precio, es el huso horario.** Aguascalientes es
UTC−6 sin horario de verano: solapas casi todo el día hábil con agencias del
centro de Estados Unidos. GoWP y E2M compiten con equipos que no solapan. El
pitch no es "más barato", es *mismo horario, misma llamada, sin treinta personas
entre tú y quien escribe el código*.

**Lo que hace que una agencia se vaya, en orden:** estimaciones de tiempo
inexactas —la queja número uno documentada, por encima de la lentitud—,
responsividad inconsistente, no preguntar por el alcance, y cualquier huella
tuya frente a su cliente. El miedo que repiten: *si el de atrás la riega, yo soy
quien tiene que llamar al cliente a disculparse*. En el NDA típico: no revelar
la identidad de ningún cliente, **no mencionar siquiera la existencia de la
relación**, y cubrir su estructura de precios.

**Dos mecánicas comerciales que vale la pena robar:** SiteCare vende *"Good Web
Vitals en 14 días o no pagas"* —garantía condicionada y verificable—; WP Buffs
da 20 % de descuento permanente con dos o más sitios y 10 % adicional con diez,
lo que hace obvio agregar el segundo.

**Y no construyas reportería de mantenimiento**, ya existe y es barata:

| Herramienta | Costo | Qué da |
|---|---|---|
| **MainWP Pro** | **$599 una vez**, sitios ilimitados | Reportes marca blanca, **servidor MCP** |
| **WP Umbrella** | **$2.19/sitio/mes** | Updates con regresión visual y rollback, errores PHP, **PDF con marca donde agregas trabajo manual** |
| **InstaWP** | $2/mes por staging | Entornos de prueba |

Con veinte sitios la operación completa cuesta **$120–160/mes**, y el PDF
mensual con la marca de la agencia resuelve el 80 % del caso de "marca blanca de
segundo nivel" sin construir un segundo portal.

---

## 8. Riesgos técnicos: lo que medí en tu sistema

Esta sección no es teoría. Son mediciones sobre tu base y tu instancia.

### 8.1 Realtime: diagnóstico cerrado

Tu WebSocket falla, y ya sé por qué **no** es. Las cabeceras:

```
HTTP/1.1 403 Forbidden
Server: Cowboy
Via: 1.1 kong/3.9.3
X-Kong-Upstream-Latency: 2008
```

`Cowboy` es el servidor de Erlang que usa Realtime, y `X-Kong-Upstream-Latency`
significa que **Kong enrutó y el upstream respondió**. Descarta enrutamiento de
Kong, descarta Traefik, descarta el upgrade de WebSocket. **El 403 lo emite
Realtime.**

Y el dato que lo cierra: **no existe ningún slot de replicación**.

```sql
select * from pg_replication_slots;  -- 0 filas
```

Con `wal_level = logical` y las cuatro tablas publicadas, que no haya slot
significa que **Realtime nunca ha logrado iniciar su tenant**. El tenant existe
con un `jwt_secret` de 64 caracteres, pero está **cifrado con `DB_ENC_KEY`**. Si
esa clave cambió después de sembrarlo —o si `API_JWT_SECRET` no coincide con el
`JWT_SECRET` global— Realtime no puede descifrarlo, no arranca el tenant, y
rechaza el socket con 403 mientras su healthcheck sigue en verde.

**Qué hacer, en este orden:**

1. Verifica en el `.env` de Supabase que `API_JWT_SECRET` sea **idéntico** a
   `JWT_SECRET`, que `SECRET_KEY_BASE` tenga **64 caracteres o más** y que
   `DB_ENC_KEY` tenga **exactamente 16**.
2. Si algo no cuadra, corrígelo, borra la fila del tenant y reinicia el
   contenedor con `SEED_SELF_HOST=true` para que lo siembre con las llaves
   actuales.
3. Comprueba con el mismo `curl`: un **101 Switching Protocols** es el objetivo.

Mientras tanto el tablero no se queda ciego: detecta que el canal no levantó y
consulta cada 20 segundos, avisándolo en pantalla.

Un dato tranquilizador: `max_slot_wal_keep_size` está en **512 MB**, así que el
modo de fallo clásico de self-hosted —Realtime caído, WAL creciendo sin límite
hasta llenar el disco y tumbar Postgres— **no te aplica**.

### 8.2 Un bug de disponibilidad que ya arreglé

Las políticas del bucket hacían `(split_part(name,'/',1))::uuid`. Lo reproduje:
**basta un solo objeto cuyo primer segmento no sea un UUID** —una carpeta creada
desde Studio, un `.emptyFolderPlaceholder`— para que el cast reviente durante la
evaluación de la política y **el listado del bucket falle para todos**:

```
ERROR: invalid input syntax for type uuid: "carpeta-suelta"
```

La descarga por ruta directa seguía funcionando; el listado no. Corregido en
[`005_rls_afinado.sql`](../supabase/migrations/005_rls_afinado.sql) comparando
texto contra texto. Verificado después: el listado funciona, y el objeto ajeno
ni se lista ni se descarga.

### 8.3 RLS: medido antes y después

El patrón `organization_id in (select public.my_org_ids())` **ya estaba bien**:
Postgres lo resuelve como *hashed SubPlan* evaluado una vez por consulta.

Lo que costaba era `or public.is_platform_admin()` sin envolver, en dieciocho
políticas. Medido con 20 organizaciones y 4,000 tareas:

| Tablero de un cliente (200 tareas) | Antes | Después |
|---|---|---|
| Planificación | 13.4 ms | **3.7 ms** |
| Ejecución | 9.4 ms | **5.7 ms** |
| Bloques leídos | 1,140 | **804** |

`is_platform_admin()` pasó de ser una llamada dentro del filtro de cada tabla a
`(InitPlan).col1` —una vez por consulta—, y varios InitPlans salen como *never
executed* porque Postgres los cortocircuita. **2.4x en total.**

A tu escala los 23 ms originales tampoco dolían. Lo hice porque es mecánico y
porque los benchmarks de Supabase miden hasta **14,000x** en este mismo caso
sobre tablas grandes, y es mucho más barato hacerlo ahora que con datos encima.

### 8.4 Lo que sigue costando, y cuándo importará

**Los contadores de la vista son subconsultas correlacionadas.**
`comment_count` y `attachment_count` se ejecutan **una vez por tarea**. Hoy no se
nota porque no hay comentarios. Con volumen real, es lo primero que hay que
cambiar por un join agregado.

**Los eventos DELETE filtrados no llegan.** Las cuatro tablas publicadas tienen
`replica identity = default`, así que el `old_record` de un DELETE trae **solo la
clave primaria**. Tu filtro por `organization_id` no la encuentra y el cliente
nunca recibe el borrado. La solución no es `replica identity full` —eso escribe
la fila entera en el WAL en cada update—, es **borrado lógico**: un `deleted_at`
tratado como update.

**`postgres_changes` no escala como parece.** La autorización es por suscriptor:
un cambio con 100 suscriptores ejecuta 100 comprobaciones. Con RLS el techo son
~3,000–4,000 mensajes por segundo **sin importar el tamaño de la instancia**.
Broadcast desde la base llega a 80,000 usuarios. Migrar al pasar de ~2,000
suscriptores; hoy estás a tres órdenes de magnitud.

### 8.5 `pg_net` pierde eventos en silencio

Tus triggers disparan webhooks con `pg_net`:

- **No hay reintentos. Ninguno.** Timeout por defecto 2 segundos, y si n8n no
  responde el evento se pierde sin que la aplicación se entere.
- Las tablas de cola son **UNLOGGED**: un reinicio sucio de Postgres las borra.
- Las respuestas se autolimpian a las **6 horas**. Si tu único registro de "el
  webhook falló" vive ahí, tienes seis horas para enterarte.
- En Docker por defecto, un benchmark independiente midió **74 req/s con ~5 % de
  pérdidas**, contra 937 en metal.

Para el volumen de un freelance es irrelevante. Cuando importe, el patrón es
*outbox*: el trigger escribe en una tabla y un consumidor con reintentos y
dead-letter hace el HTTP.

### 8.6 Una afirmación que investigué y resultó falsa

La investigación técnica reportó que `comments_member_update_own` permitía a un
miembro **mover su comentario a otra organización**. Lo probé, y **no se
reproduce**: bloqueado con 42501 tanto por la API como en SQL directo. Lo mismo
para tareas, proyectos y clientes finales.

Dicho eso, el motivo no se lee en la política —su `with check` solo miraba
`author_id`—, y depender de un mecanismo que no se explica leyendo el código es
frágil. En la migración 005 el `with check` quedó explícito.

### 8.7 Respaldos: el hueco más grande que queda

**No existe procedimiento oficial de respaldo para Supabase self-hosted.** Los
errores que hay que evitar:

- **`supabase db dump` no sirve**: excluye los esquemas internos. Si lo usas como
  respaldo, **pierdes `auth.users` entero**.
- **El respaldo de la base no incluye los archivos de Storage.** Restaurar solo
  la base deja metadatos apuntando a archivos que no existen.
- **Sin el `.env` el respaldo es inservible**: sin `JWT_SECRET`, `ANON_KEY`,
  `SERVICE_ROLE_KEY`, `SECRET_KEY_BASE` y `DB_ENC_KEY` no se reconstruyen ni los
  tokens de auth ni los tenants de Realtime.

Hay que respaldar cuatro cosas: `pg_dumpall --roles-only`, `pg_dump` completo
con todos los esquemas, `volumes/storage`, y el `.env` cifrado y fuera del
servidor. Y **ensayar la restauración una vez al mes**: un respaldo sin probar no
es un respaldo.

---

## 9. Cómo se vería la herramienta perfecta

No como una lista de módulos. Para tu caso, la herramienta perfecta responde
cuatro preguntas sin que nadie tenga que buscarlas.

**¿Qué hago ahora?** Ya está a medias: el resumen del día con las notas privadas
es exactamente eso. Le falta saber de compromisos —esta tarea prometió tres días
y lleva cinco— para que la respuesta sea defendible y no una corazonada.

**¿Se me va a caer algo?** Hoy el tablero te lo dice si lo miras. La versión
buena te lo dice antes: esta agencia mandó seis cosas esta semana y En progreso
ya tiene cuatro; esta tarea lleva nueve días sin movimiento y vence el jueves.

**¿Este cliente me conviene?** Es la que hoy no puede contestar, y es la que
decide si el año que viene subes precios, cambias el paquete o dejas de trabajar
con alguien. No necesitas facturar desde aquí; necesitas registrar esfuerzo
aproximado por tarea.

**Y una cuarta, que es de tus clientes: ¿tengo que escribirle para saber?** Cada
vez que la respuesta sea sí, el portal falló.

**Pero la tesis de fondo cambió con la sección 3.** No estás construyendo un
portal al que el cliente entre: **estás construyendo tu sistema de registro, con
una superficie de correo para el cliente.** Los datos lo respaldan —7 % prefiere
portales, 23 % de adopción sin estrategia deliberada, 60 % entra una sola vez—.
El portal es para quien quiera entrar; el correo es el canal de verdad.

---

## 10. Por dónde empezar

**Primero, y son horas, no semanas:**

1. **Magic link** (§4.1) — mata el antipatrón nº1 documentado.
2. **Notificar por inacción a 72 h**, no por cada movimiento (§4.3) — es cambiar
   condiciones del workflow, no escribir código nuevo.
3. **Captura estructurada por tipo** (§4.6), **SLA con reloj pausable** (§4.5) y
   **aprobación con registro** (§4.4). Los tres se apoyan en columnas que ya
   existen, **cambian la conversación diaria con tus clientes**, y son
   exactamente lo que la categoría entera dejó sin resolver mientras se iba a la
   IA.

**Después:**

4. **Correo entrante → comentario** (§4.2). Es lo que más cambia el día a día y
   lo que ninguna herramienta de $19–99/mes automatiza bien.
5. **Aprobar desde el correo, de un clic, sin login.**
6. **Marca por agencia** (§4.9) — la mayor palanca comercial que falta.
7. **Límite de trabajo en curso** (§4.8) — lo que hace sostenible recibir trabajo
   sin techo.

**Lo fiscal, cuando haya con qué:**

8. **Habla con tu contador sobre §6.1 antes que nada.** Un 21.7 % de flujo de
   caja depende de esa decisión, y no requiere escribir código.
9. **Negocia facturar contra pago** (§6.4). Si lo consigues, te ahorras el REP
   entero.
10. Stripe MX + **Facturama** cuando tengas tres meses de datos que valga la pena
    facturar.

**En paralelo, lo de infraestructura y papeleo:**

11. **Respaldos de verdad** (§8.7). Es más importante que cualquier función de
    esta lista.
12. **Arreglar el tenant de Realtime** (§8.1).
13. **El DPA y el aviso de privacidad conforme a la ley de 2025** (§6.5), y el
    **contrato marco con reserva de IP** (§6.6). Dos documentos, una revisión de
    abogado, y los reutilizas siempre.

**Costo incremental de todo el plan técnico: ~$16.50 USD/mes** (correo entrante)
**+ $1,650 MXN/año** de Facturama cuando llegue **+ comisiones de Stripe.**

**Y el complemento que probablemente deberías comprar hoy, construyas o no:**
**BugHerd a $50/mes** —invitados ilimitados anotando sobre el staging— o
**Ziflow Personal, gratis**, con versiones ilimitadas y comparación píxel a
píxel. Es la única categoría donde el mercado ya es mejor y más barato que
cualquier cosa que puedas escribir.
