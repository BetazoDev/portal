# Automatizaciones en n8n

Dos workflows, los dos **creados y sin publicar** en la instancia del dueño.
Un flujo activo con un dato mal puesto manda correos reales a clientes reales,
así que ninguno se activa hasta completar la lista de abajo.

| Workflow | ID | Qué hace |
|---|---|---|
| CRM — eventos | `ft7QFQlkbH6J9bxN` | Webhook `/crm-events`. Valida el secreto, reparte por evento y manda los correos |
| CRM — resumen diario | `mJkd9NrFsvuJLYg6` | Cron horario que le pide el resumen del día al CRM |

El código fuente del primero vive en [`crm-eventos.workflow.js`](crm-eventos.workflow.js),
escrito con el SDK de n8n. El de n8n es la copia; ésta es la que se versiona.

---

## Qué falta antes de activarlos

### 1. El secreto compartido

En el CRM, en **Configuración**, genera el secreto y cópialo. Va en dos lugares
de n8n:

- **CRM — eventos**, nodo *Secreto correcto*: sustituye
  `PEGA_AQUI_EL_SECRETO_DE_APP_CONFIG` en el campo de comparación.
- **CRM — resumen diario**, nodo *Pedirle el resumen al CRM*: el header
  `X-CRM-Secret`.

Si no coincide, el flujo de eventos corta la ejecución sin procesar nada: el
item se va por la rama falsa y no se ve ningún error, simplemente no pasa.

⚠️ **No lo copies de vuelta a `crm-eventos.workflow.js`.** Ese archivo se
versiona y el marcador tiene que quedarse ahí. El secreto vive en `app_config`,
en el entorno de la aplicación y en n8n; en el repositorio, nunca.

### 2. El remitente

Los tres nodos de correo traen `PON_AQUI_TU_REMITENTE@tu-dominio.com`. Pon un
buzón que exista en BillionMail.

### 3. Las URLs de los nodos

- Los tres nodos *Registrar…* traen `PON_AQUI_TU_SUPABASE`. Va la URL base de
  Supabase, sin diagonal al final, de modo que quede
  `https://TU-SUPABASE/rest/v1/email_log`.
- El nodo del resumen trae `PON_AQUI_LA_URL_DEL_CRM`. Va el dominio público del
  CRM, el mismo que pusiste en `app_base_url` — **sin diagonal final**, o los
  enlaces de los correos salen con doble barra.

(La URL del propio webhook, que es otra cosa, está en el punto 6.)

### 4. Las credenciales

**SMTP.** n8n asignó sola la credencial llamada *SMTP account* a los tres nodos
de correo, porque es la primera de ese tipo que encontró. **Verifica que sea la
de BillionMail y no *SMTP account 2*** antes de activar nada.

**Supabase.** Los tres nodos *Registrar…* usan una credencial de tipo
**Simplified Custom Auth** (en el nodo: *Authentication* → `Generic Credential
Type` → *Generic Auth Type* → `Simplified Custom Auth`). Nómbrala
`Supabase service_role`.

En **Auth template**:

```json
{
  "headers": {
    "apikey": "{{api_key}}",
    "Authorization": "Bearer {{api_key}}"
  }
}
```

Al pegarla aparece solo un campo `api_key` bajo **Fields** — ahí va la
`service_role`. El marcador está dos veces pero el campo es uno, así que la
llave se pega una sola vez.

En **Test URL** pon la raíz de PostgREST, no una tabla, para que la prueba
valide la credencial y no los permisos de algo concreto:

```
https://TU-SUPABASE/rest/v1/
```

**Accepted status codes** vacío: por defecto acepta 2xx, que es lo que
devuelve.

Las **dos cabeceras son obligatorias**. Medido contra la instancia real:

| Cabeceras | Leer | Escribir |
|---|---|---|
| solo `apikey` | 200 | **401** |
| solo `Authorization` | 401 | 401 |
| las dos | 200 | **201** |

Kong autentica con `apikey`, pero PostgREST decide el rol con el JWT del
`Authorization`. Por eso *Header Auth* no sirve: solo admite una cabecera.

El valor es la `service_role`, la única llave que puede escribir en `email_log`.
**Se salta RLS por completo**: que no salga de n8n.

Y ojo con la URL de los nodos: al ser *HTTP Request*, la ruta va completa
(`https://TU-SUPABASE/rest/v1/email_log`). El nodo **nativo** de Supabase es al
revés — ahí el host va sin `/rest/v1`, porque lo añade él. Confundirlos da un
`/rest/v1/rest/v1/` y un 404.

### 5. Apagar el guardado de ejecuciones

🔴 **Antes de activar el flujo**, en **Settings** del workflow:
**Save successful production executions → Do not save**.

n8n guarda por defecto la carga completa de cada ejecución. El evento
`user.created` lleva la **contraseña temporal en claro**, así que con el ajuste
por defecto queda persistida en el historial y visible para cualquiera que
entre al panel. La sección 8 de `AGENTS.md` dice que esa contraseña no se
registra en ningún log, y el historial de n8n es un log.

Los errores sí pueden seguir guardándose: no llevan la carga completa. Y si
durante las pruebas quedó alguna ejecución con contraseña, bórrala al terminar.

### 6. Las dos URLs, que son dos caminos distintos

Copia la **URL de producción** del webhook —`/webhook/…`, no `/webhook-test/…`,
que solo escucha mientras tienes el editor abierto y muere tras una sola
llamada— y ponla en **los dos sitios**:

| Evento | Quién lo manda | De dónde saca la URL y el secreto |
|---|---|---|
| `task.created`, `task.updated`, `comment.created` | Postgres, por trigger con `pg_net` | `app_config` — se edita en **Configuración** |
| `user.created` | La aplicación, con `fetch` | `N8N_WEBHOOK_URL` y `N8N_WEBHOOK_SECRET`, variables de entorno |

No son redundantes: la base no ve las variables de entorno de la aplicación, y
la aplicación no lee `app_config` para esto. **Si llenas solo uno, la mitad de
los correos funciona y la otra mitad no, en silencio.** El secreto tiene que ser
idéntico en los dos, o el nodo *Secreto correcto* corta.

Mientras la URL de `app_config` esté vacía, la base no intenta mandar nada y las
altas de cliente te devuelven la contraseña para que la entregues tú.

---

## Cómo funciona el flujo de eventos

```
Webhook /crm-events
  └─ Normalizar la entrada        evento, secreto y carga, con optional chaining
      └─ Secreto correcto         si no coincide, se acaba aquí
          └─ Repartir por evento
               ├── user.created      → Redactar credenciales → 1 correo → email_log
               ├── task.created      ┐
               ├── task.updated      ├→ Redactar los dos correos ┬→ correo al dueño   → email_log
               └── comment.created   ┘                          └→ correo al cliente → email_log
```

Los dos correos salen de nodos separados, no de un CC: los textos son distintos
y el log necesita saber cuál de los dos falló. Los dos llevan
`onError: continueRegularOutput`, así que si uno se cae el otro sale igual.

El payload llega enriquecido desde Postgres —`build_task_payload` resuelve
nombres, correos y destinatarios— así que n8n **no consulta de vuelta a
Supabase** para redactar.

Un `task.updated` con varios cambios produce **un solo correo** que los menciona
todos, no uno por campo.

## Cómo probar sin mandar correos

```bash
node n8n/probar-redaccion.mjs
```

Saca el `jsCode` de los nodos Code del archivo del workflow y lo corre contra
payloads reales de `build_task_payload`, imprimiendo los cuatro correos. Sirve
para revisar la redacción sin tocar el SMTP.

Cuando ya quieras probarlo dentro de n8n, usa pin data en los nodos de correo
para que no lleguen a ejecutarse.
