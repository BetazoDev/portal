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

Si no coincide, el flujo de eventos corta la ejecución sin procesar nada.

### 2. El remitente

Los tres nodos de correo traen `PON_AQUI_TU_REMITENTE@tu-dominio.com`. Pon un
buzón que exista en BillionMail.

### 3. Las URLs

- Los tres nodos *Registrar…* traen `PON_AQUI_TU_SUPABASE`. Va la URL base de
  Supabase, sin diagonal al final.
- El nodo del resumen trae `PON_AQUI_LA_URL_DEL_CRM`. Va el dominio público del
  CRM, el mismo que pusiste en `app_base_url`.

### 4. Las credenciales

**SMTP.** n8n asignó sola la credencial llamada *SMTP account* a los tres nodos
de correo, porque es la primera de ese tipo que encontró. **Verifica que sea la
de BillionMail y no *SMTP account 2*** antes de activar nada.

**Supabase.** Los tres nodos *Registrar…* necesitan una credencial de tipo
*Custom Auth* con esta plantilla, para que PostgREST acepte la llave:

```json
{
  "headers": {
    "apikey": "{{api_key}}",
    "Authorization": "Bearer {{api_key}}"
  }
}
```

El valor de `api_key` es la `service_role`. Es la única llave que puede escribir
en `email_log`.

### 5. La URL del webhook, de vuelta en el CRM

Copia la URL de producción del webhook y pégala en **Configuración →
URL del webhook de n8n**. Mientras esté vacía, la base no intenta mandar nada y
las altas de cliente te devuelven la contraseña para que la entregues tú.

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
