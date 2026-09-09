import {
  workflow,
  node,
  trigger,
  ifElse,
  switchCase,
  newCredential,
  expr,
} from '@n8n/workflow-sdk';

const webhookEventos = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Eventos del CRM',
    parameters: {
      httpMethod: 'POST',
      path: 'crm-events',
      responseMode: 'onReceived',
      options: {},
    },
  },
  output: [
    {
      headers: { 'x-crm-secret': 'el-secreto-compartido' },
      body: {
        event: 'task.updated',
        changes: [{ field: 'status', from: 'en_progreso', to: 'esperando_cliente' }],
        actor: { name: 'Humberto Alonso', email: 'humberto@ejemplo.mx', role: 'platform_admin' },
        task: {
          id: '4fc3dade',
          title: 'Rediseño de la página de contacto',
          status: 'esperando_cliente',
          priority: 'alta',
          type: 'Desarrollo',
          due_date: '2026-09-14',
          url: 'https://crm.ejemplo.mx/tareas/4fc3dade',
        },
        project: { name: 'Sitio Lumina' },
        end_client: { name: 'Lumina Dental' },
        organization: { name: 'Agencia Norte' },
        recipients: { admin: 'humberto@ejemplo.mx', client: ['marina@agencianorte.mx'] },
      },
    },
  ],
});

const normalizar = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Normalizar la entrada',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          {
            id: 'evento',
            name: 'evento',
            value: expr('{{ $json.body?.event ?? $json.event ?? "" }}'),
            type: 'string',
          },
          {
            id: 'secreto',
            name: 'secreto',
            value: expr('{{ $json.headers?.["x-crm-secret"] ?? $json.secreto ?? "" }}'),
            type: 'string',
          },
          {
            id: 'carga',
            name: 'carga',
            value: expr('{{ $json.body ?? $json }}'),
            type: 'object',
          },
        ],
      },
    },
  },
  output: [
    {
      evento: 'task.updated',
      secreto: 'el-secreto-compartido',
      carga: { event: 'task.updated' },
    },
  ],
});

const secretoValido = ifElse({
  version: 2.3,
  config: {
    name: 'Secreto correcto',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            leftValue: expr('{{ $json.secreto }}'),
            operator: { type: 'string', operation: 'equals' },
            rightValue: 'PEGA_AQUI_EL_SECRETO_DE_APP_CONFIG',
          },
        ],
        combinator: 'and',
      },
    },
  },
  output: [{ evento: 'task.updated', secreto: 'el-secreto-compartido' }],
});

const repartirPorEvento = switchCase({
  version: 3.4,
  config: {
    name: 'Repartir por evento',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
            renameOutput: true,
            outputKey: 'user.created',
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  leftValue: expr('{{ $json.evento }}'),
                  operator: { type: 'string', operation: 'equals' },
                  rightValue: 'user.created',
                },
              ],
              combinator: 'and',
            },
          },
          {
            renameOutput: true,
            outputKey: 'task.created',
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  leftValue: expr('{{ $json.evento }}'),
                  operator: { type: 'string', operation: 'equals' },
                  rightValue: 'task.created',
                },
              ],
              combinator: 'and',
            },
          },
          {
            renameOutput: true,
            outputKey: 'task.updated',
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  leftValue: expr('{{ $json.evento }}'),
                  operator: { type: 'string', operation: 'equals' },
                  rightValue: 'task.updated',
                },
              ],
              combinator: 'and',
            },
          },
          {
            renameOutput: true,
            outputKey: 'comment.created',
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  leftValue: expr('{{ $json.evento }}'),
                  operator: { type: 'string', operation: 'equals' },
                  rightValue: 'comment.created',
                },
              ],
              combinator: 'and',
            },
          },
        ],
      },
      options: {},
    },
  },
  output: [{ evento: 'task.updated', carga: { event: 'task.updated' } }],
});

const redactarCredenciales = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Redactar credenciales',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode:
        'const c = $json.carga;\n' +
        'const nombre = c.user?.name || "Hola";\n' +
        'const url = c.app_url || "";\n' +
        'return { json: {\n' +
        '  paraCliente: c.credentials?.email || c.user?.email || "",\n' +
        '  asuntoCliente: "Tu acceso a " + (c.organization?.name || "tu portal"),\n' +
        '  textoCliente: [\n' +
        '    nombre + ",",\n' +
        '    "",\n' +
        '    "Ya está listo tu acceso al portal de proyectos.",\n' +
        '    "",\n' +
        '    "Correo: " + (c.credentials?.email || ""),\n' +
        '    "Contraseña temporal: " + (c.credentials?.password || ""),\n' +
        '    "",\n' +
        '    "Entra en " + url + " y cámbiala en cuanto puedas: solo sirve para el primer acceso.",\n' +
        '    "",\n' +
        '    "Desde ahí puedes capturar a tus clientes, abrir proyectos y pedir trabajo. Cada vez que algo se mueva, te avisamos por este mismo correo."\n' +
        '  ].join("\\n"),\n' +
        '  audiencia: "client",\n' +
        '  evento: "user.created",\n' +
        '  organizationId: c.organization?.id || null,\n' +
        '  taskId: null\n' +
        '} };',
    },
  },
  output: [
    {
      paraCliente: 'marina@agencianorte.mx',
      asuntoCliente: 'Tu acceso a Agencia Norte',
      textoCliente: 'Marina Ruiz,',
      audiencia: 'client',
      evento: 'user.created',
      organizationId: 'org-1',
      taskId: null,
    },
  ],
});

const redactarCorreos = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Redactar los dos correos',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode:
        '// Un solo correo por evento aunque traiga varios cambios.\n' +
        'const c = $json.carga;\n' +
        'const evento = $json.evento;\n' +
        '\n' +
        'const ESTADOS = { nuevo: "Nuevas", en_revision: "En revisión", en_progreso: "En progreso", esperando_cliente: "Esperando cliente", hecho: "Hecho", cancelado: "Cancelado" };\n' +
        'const PRIORIDADES = { baja: "Baja", media: "Media", alta: "Alta", urgente: "Urgente" };\n' +
        'const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];\n' +
        '\n' +
        'function fechaLarga(iso) {\n' +
        '  if (!iso) return null;\n' +
        '  const p = String(iso).slice(0, 10).split("-");\n' +
        '  return Number(p[2]) + " de " + MESES[Number(p[1]) - 1];\n' +
        '}\n' +
        '\n' +
        'function diasPara(iso) {\n' +
        '  if (!iso) return null;\n' +
        '  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);\n' +
        '  return Math.round((new Date(String(iso).slice(0, 10) + "T00:00:00") - hoy) / 86400000);\n' +
        '}\n' +
        '\n' +
        'function vencimiento(iso) {\n' +
        '  const d = diasPara(iso);\n' +
        '  if (d === null) return "sin fecha";\n' +
        '  if (d < 0) return "venció hace " + Math.abs(d) + (Math.abs(d) === 1 ? " día" : " días");\n' +
        '  if (d === 0) return "vence hoy";\n' +
        '  if (d === 1) return "vence mañana";\n' +
        '  return "vence en " + d + " días";\n' +
        '}\n' +
        '\n' +
        'const t = c.task || {};\n' +
        'const ruta = [c.organization?.name, c.end_client?.name, c.project?.name].filter(Boolean).join(" / ");\n' +
        'const quien = c.actor?.name || c.actor?.email || "Alguien";\n' +
        'const cambios = Array.isArray(c.changes) ? c.changes : [];\n' +
        '\n' +
        '// Una frase por cambio, unidas en una sola línea. Nunca un correo por campo.\n' +
        'const frasesCliente = cambios.map(function (x) {\n' +
        '  if (x.field === "status") return "pasó de " + (ESTADOS[x.from] || x.from) + " a " + (ESTADOS[x.to] || x.to);\n' +
        '  if (x.field === "priority") return "cambió de prioridad a " + (PRIORIDADES[x.to] || x.to);\n' +
        '  if (x.field === "due_date") return x.to ? "movió su entrega al " + fechaLarga(x.to) : "se quedó sin fecha de entrega";\n' +
        '  if (x.field === "title") return "cambió de título";\n' +
        '  if (x.field === "assigned_to") return "cambió de responsable";\n' +
        '  return "se actualizó";\n' +
        '});\n' +
        '\n' +
        'function unir(lista) {\n' +
        '  if (lista.length === 0) return "se actualizó";\n' +
        '  if (lista.length === 1) return lista[0];\n' +
        '  return lista.slice(0, -1).join(", ") + " y " + lista[lista.length - 1];\n' +
        '}\n' +
        '\n' +
        'let asuntoCliente, textoCliente, asuntoDueno, textoDueno;\n' +
        '\n' +
        'if (evento === "task.created") {\n' +
        '  asuntoCliente = "Recibimos tu solicitud: " + t.title;\n' +
        '  textoCliente = [\n' +
        '    "Ya tenemos tu solicitud y está en la fila para revisarse.",\n' +
        '    "",\n' +
        '    t.title,\n' +
        '    "Proyecto: " + (c.project?.name || "sin proyecto"),\n' +
        '    "Fecha de entrega: " + (fechaLarga(t.due_date) || "por definir"),\n' +
        '    "",\n' +
        '    "Puedes seguirla aquí: " + (t.url || "")\n' +
        '  ].join("\\n");\n' +
        '  asuntoDueno = "Entrada nueva: " + t.title;\n' +
        '  textoDueno = [\n' +
        '    quien + " creó " + t.title,\n' +
        '    ruta,\n' +
        '    "Tipo: " + (t.type || "sin tipo") + " · Prioridad: " + (PRIORIDADES[t.priority] || t.priority) + " · " + vencimiento(t.due_date),\n' +
        '    "",\n' +
        '    t.description || "",\n' +
        '    "",\n' +
        '    t.url || ""\n' +
        '  ].join("\\n");\n' +
        '} else if (evento === "comment.created") {\n' +
        '  const cuerpo = c.comment?.body || "";\n' +
        '  asuntoCliente = "Comentario nuevo en " + t.title;\n' +
        '  textoCliente = [\n' +
        '    quien + " escribió sobre " + t.title + ":",\n' +
        '    "",\n' +
        '    cuerpo,\n' +
        '    "",\n' +
        '    "Responde desde " + (t.url || "")\n' +
        '  ].join("\\n");\n' +
        '  asuntoDueno = "Comentario en " + t.title;\n' +
        '  textoDueno = [\n' +
        '    quien + " comentó en " + t.title,\n' +
        '    ruta,\n' +
        '    "",\n' +
        '    cuerpo,\n' +
        '    "",\n' +
        '    t.url || ""\n' +
        '  ].join("\\n");\n' +
        '} else {\n' +
        '  asuntoCliente = t.title + ": " + unir(frasesCliente);\n' +
        '  textoCliente = [\n' +
        '    "La tarea " + t.title + " del proyecto " + (c.project?.name || "sin proyecto") + " " + unir(frasesCliente) + ".",\n' +
        '    "Fecha de entrega: " + (fechaLarga(t.due_date) || "por definir") + ".",\n' +
        '    "",\n' +
        '    "Verla aquí: " + (t.url || "")\n' +
        '  ].join("\\n");\n' +
        '  asuntoDueno = "Moviste " + t.title;\n' +
        '  textoDueno = [\n' +
        '    ruta,\n' +
        '    unir(frasesCliente) + " · " + vencimiento(t.due_date),\n' +
        '    "",\n' +
        '    t.url || ""\n' +
        '  ].join("\\n");\n' +
        '}\n' +
        '\n' +
        'const correosCliente = Array.isArray(c.recipients?.client) ? c.recipients.client : [];\n' +
        '\n' +
        'return { json: {\n' +
        '  evento: evento,\n' +
        '  organizationId: c.organization?.id || null,\n' +
        '  taskId: t.id || null,\n' +
        '  paraDueno: c.recipients?.admin || "",\n' +
        '  paraCliente: correosCliente.join(","),\n' +
        '  asuntoDueno: asuntoDueno,\n' +
        '  textoDueno: textoDueno,\n' +
        '  asuntoCliente: asuntoCliente,\n' +
        '  textoCliente: textoCliente\n' +
        '} };',
    },
  },
  output: [
    {
      evento: 'task.updated',
      organizationId: 'org-1',
      taskId: '4fc3dade',
      paraDueno: 'humberto@ejemplo.mx',
      paraCliente: 'marina@agencianorte.mx',
      asuntoDueno: 'Moviste Rediseño de la página de contacto',
      textoDueno: 'Moviste Rediseño de la página de contacto',
      asuntoCliente: 'Rediseño de la página de contacto: pasó de En progreso a Esperando cliente',
      textoCliente: 'La tarea Rediseño de la página de contacto del proyecto Sitio Lumina pasó de En progreso a Esperando cliente.',
    },
  ],
});

const correoAlCliente = node({
  type: 'n8n-nodes-base.emailSend',
  version: 2.1,
  config: {
    name: 'Correo al cliente',
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'send',
      fromEmail: 'PON_AQUI_TU_REMITENTE@tu-dominio.com',
      toEmail: expr('{{ $json.paraCliente }}'),
      subject: expr('{{ $json.asuntoCliente }}'),
      emailFormat: 'text',
      text: expr('{{ $json.textoCliente }}'),
      options: { appendAttribution: false },
    },
    credentials: { smtp: newCredential('BillionMail') },
  },
  output: [{ messageId: 'abc', accepted: ['marina@agencianorte.mx'], error: null }],
});

const correoAlDueno = node({
  type: 'n8n-nodes-base.emailSend',
  version: 2.1,
  config: {
    name: 'Correo al dueño',
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'send',
      fromEmail: 'PON_AQUI_TU_REMITENTE@tu-dominio.com',
      toEmail: expr('{{ $json.paraDueno }}'),
      subject: expr('{{ $json.asuntoDueno }}'),
      emailFormat: 'text',
      text: expr('{{ $json.textoDueno }}'),
      options: { appendAttribution: false },
    },
    credentials: { smtp: newCredential('BillionMail') },
  },
  output: [{ messageId: 'def', accepted: ['humberto@ejemplo.mx'], error: null }],
});

const registrarCliente = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Registrar el correo al cliente',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'PON_AQUI_TU_SUPABASE/rest/v1/email_log',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpTemplatedCustomAuth',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'return=minimal' },
        ],
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr(
        '{{ JSON.stringify({ organization_id: $("Redactar los dos correos").item.json.organizationId, task_id: $("Redactar los dos correos").item.json.taskId, event: $("Redactar los dos correos").item.json.evento, audience: "client", recipient_email: $("Redactar los dos correos").item.json.paraCliente, subject: $("Redactar los dos correos").item.json.asuntoCliente, status: $json.error ? "failed" : "sent", error_message: $json.error ? String($json.error) : null }) }}'
      ),
      options: {},
    },
    credentials: { httpTemplatedCustomAuth: newCredential('Supabase service_role') },
  },
  output: [{ success: true }],
});

const registrarDueno = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Registrar el correo al dueño',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'PON_AQUI_TU_SUPABASE/rest/v1/email_log',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpTemplatedCustomAuth',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'return=minimal' },
        ],
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr(
        '{{ JSON.stringify({ organization_id: $("Redactar los dos correos").item.json.organizationId, task_id: $("Redactar los dos correos").item.json.taskId, event: $("Redactar los dos correos").item.json.evento, audience: "admin", recipient_email: $("Redactar los dos correos").item.json.paraDueno, subject: $("Redactar los dos correos").item.json.asuntoDueno, status: $json.error ? "failed" : "sent", error_message: $json.error ? String($json.error) : null }) }}'
      ),
      options: {},
    },
    credentials: { httpTemplatedCustomAuth: newCredential('Supabase service_role') },
  },
  output: [{ success: true }],
});

const registrarCredenciales = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Registrar el correo de acceso',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'PON_AQUI_TU_SUPABASE/rest/v1/email_log',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpTemplatedCustomAuth',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'return=minimal' },
        ],
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr(
        '{{ JSON.stringify({ organization_id: $("Redactar credenciales").item.json.organizationId, event: "user.created", audience: "client", recipient_email: $("Redactar credenciales").item.json.paraCliente, subject: $("Redactar credenciales").item.json.asuntoCliente, status: $json.error ? "failed" : "sent", error_message: $json.error ? String($json.error) : null }) }}'
      ),
      options: {},
    },
    credentials: { httpTemplatedCustomAuth: newCredential('Supabase service_role') },
  },
  output: [{ success: true }],
});

const correoDeAcceso = node({
  type: 'n8n-nodes-base.emailSend',
  version: 2.1,
  config: {
    name: 'Correo con las credenciales',
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'send',
      fromEmail: 'PON_AQUI_TU_REMITENTE@tu-dominio.com',
      toEmail: expr('{{ $json.paraCliente }}'),
      subject: expr('{{ $json.asuntoCliente }}'),
      emailFormat: 'text',
      text: expr('{{ $json.textoCliente }}'),
      options: { appendAttribution: false },
    },
    credentials: { smtp: newCredential('BillionMail') },
  },
  output: [{ messageId: 'ghi', accepted: ['marina@agencianorte.mx'], error: null }],
});

export default workflow('crm-eventos', 'CRM — eventos')
  .add(webhookEventos)
  .to(normalizar)
  .to(
    secretoValido.onTrue(
      repartirPorEvento
        .onCase(0, redactarCredenciales.to(correoDeAcceso.to(registrarCredenciales)))
        .onCase(1, redactarCorreos)
        .onCase(2, redactarCorreos)
        .onCase(3, redactarCorreos)
    )
  )
  .add(redactarCorreos)
  .to(correoAlDueno.to(registrarDueno))
  .add(redactarCorreos)
  .to(correoAlCliente.to(registrarCliente))
  ;
