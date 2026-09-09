/**
 * Prueba de la redacción de los correos de n8n, fuera de n8n.
 *
 *   node n8n/probar-redaccion.mjs
 *
 * Extrae el jsCode del nodo "Redactar los dos correos" del archivo del
 * workflow y lo corre contra payloads reales de build_task_payload. Así se
 * comprueba el texto sin arriesgar un envío: un flujo activo con un bug manda
 * correos de verdad a clientes de verdad.
 */

import { readFileSync } from "node:fs";

const fuente = readFileSync(new URL("./crm-eventos.workflow.js", import.meta.url), "utf8");

/** Recupera el jsCode de un nodo Code a partir de su nombre. */
function codigoDelNodo(nombre) {
  const marca = `name: '${nombre}'`;
  const desde = fuente.indexOf(marca);
  if (desde === -1) throw new Error(`No encontré el nodo ${nombre}`);

  const inicio = fuente.indexOf("jsCode:", desde);
  const fin = fuente.indexOf("\n    },", inicio);
  const trozo = fuente.slice(inicio + "jsCode:".length, fin);

  // El SDK obliga a concatenar líneas con +; aquí se vuelven a unir.
  const partes = trozo.match(/'(?:[^'\\]|\\.)*'/g) ?? [];
  return partes
    .map((p) => JSON.parse('"' + p.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'))
    .join("");
}

function ejecutar(nombreDelNodo, entrada) {
  const cuerpo = codigoDelNodo(nombreDelNodo);
  const fn = new Function("$json", cuerpo);
  return fn(entrada).json;
}

// Payload real, tal como lo arma build_task_payload en Postgres.
const cargaBase = {
  event: "task.updated",
  changes: [
    { to: "en_progreso", from: "nuevo", field: "status" },
    { to: "alta", from: "media", field: "priority" },
    { to: "2026-09-20", from: null, field: "due_date" },
  ],
  actor: { name: "Marina Ruiz", email: "marina@agencianorte.mx", role: "client_member" },
  task: {
    id: "4fc3dade",
    title: "El formulario de citas manda correo duplicado",
    description: "Cada vez que alguien agenda, llegan dos correos al consultorio.",
    status: "en_progreso",
    priority: "urgente",
    type: "Urgente",
    due_date: "2026-09-20",
    url: "https://crm.tu-dominio.com/tareas/4fc3dade",
  },
  project: { name: "Sitio Lumina" },
  end_client: { name: "Lumina Dental", company: "Clínica Lumina" },
  organization: { name: "Agencia Norte" },
  recipients: { admin: "humberto@ejemplo.mx", client: ["marina@agencianorte.mx"] },
};

const casos = [
  {
    nombre: "task.updated con tres cambios",
    nodo: "Redactar los dos correos",
    entrada: { evento: "task.updated", carga: cargaBase },
  },
  {
    nombre: "task.created",
    nodo: "Redactar los dos correos",
    entrada: { evento: "task.created", carga: { ...cargaBase, event: "task.created", changes: [] } },
  },
  {
    nombre: "comment.created",
    nodo: "Redactar los dos correos",
    entrada: {
      evento: "comment.created",
      carga: {
        ...cargaBase,
        event: "comment.created",
        changes: [],
        comment: { body: "¿Ya revisaron los accesos al hosting?" },
      },
    },
  },
  {
    nombre: "user.created",
    nodo: "Redactar credenciales",
    entrada: {
      evento: "user.created",
      carga: {
        organization: { id: "org-1", name: "Agencia Norte" },
        user: { name: "Marina Ruiz", email: "marina@agencianorte.mx" },
        credentials: { email: "marina@agencianorte.mx", password: "8xwntPxy58daDLvA" },
        app_url: "https://crm.tu-dominio.com",
      },
    },
  },
];

let fallos = 0;

for (const caso of casos) {
  const salida = ejecutar(caso.nodo, caso.entrada);

  console.log("\n" + "=".repeat(70));
  console.log(caso.nombre);
  console.log("=".repeat(70));

  if (caso.nodo === "Redactar credenciales") {
    console.log("\n[ cliente ]", salida.asuntoCliente);
    console.log(salida.textoCliente);
  } else {
    console.log("\n[ dueño ]", salida.asuntoDueno);
    console.log(salida.textoDueno);
    console.log("\n[ cliente ]", salida.asuntoCliente);
    console.log(salida.textoCliente);
  }

  const vacios = Object.entries(salida).filter(
    ([k, v]) => k.startsWith("asunto") && (!v || String(v).includes("undefined"))
  );
  if (vacios.length > 0) {
    console.log("\nFALLA: asunto vacío o con undefined:", vacios);
    fallos += 1;
  }
  if (String(salida.textoCliente).includes("undefined")) {
    console.log("\nFALLA: el texto al cliente trae undefined");
    fallos += 1;
  }
}

// El requisito de la sección 9: un task.updated con varios cambios produce UN
// solo correo que los menciona todos, no uno por cambio.
const conTres = ejecutar("Redactar los dos correos", {
  evento: "task.updated",
  carga: cargaBase,
});
const menciona =
  conTres.textoCliente.includes("En progreso") &&
  conTres.textoCliente.includes("Alta") &&
  conTres.textoCliente.includes("20 de septiembre");

console.log("\n" + "=".repeat(70));
console.log(
  menciona
    ? "PASA  Un task.updated con tres cambios produce un solo correo que los menciona todos."
    : "FALLA Los tres cambios no aparecen juntos en un mismo correo."
);
if (!menciona) fallos += 1;

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} problema(s).\n`);
process.exit(fallos === 0 ? 0 : 1);
