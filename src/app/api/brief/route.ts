import { NextResponse } from "next/server";

import { descifrar } from "@/lib/cifrado";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, formatearFecha, type Estado, type Prioridad } from "@/lib/dominio";
import { envServidor } from "@/lib/env";
import { necesitaLlave, pedirAlModelo, type Proveedor } from "@/lib/llm";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";

const SISTEMA = `Eres el asistente de un desarrollador web freelance de Aguascalientes que
atiende a varias agencias de marketing.

Escribes en español de México, en tono directo y conversable, sin adornos ni
disculpas. Nunca inventas datos: si algo no está en la información que recibes,
no lo mencionas.

Devuelves markdown corto, en tres secciones con este encabezado exacto:

## Atiende hoy
## En riesgo
## Cierra rápido

Cada viñeta nombra la tarea, dice en una línea por qué está ahí y, cuando las
notas privadas expliquen el atorón, lo dice con esas palabras. Máximo cuatro
viñetas por sección. Si una sección queda vacía, escribe una línea diciendo que
no hay nada ahí.`;

type FilaTarea = {
  id: string;
  title: string;
  status: Estado;
  priority: Prioridad;
  due_date: string | null;
  updated_at: string;
  task_type_name: string | null;
  project_name: string;
  end_client_name: string;
  organization_name: string;
};

function diasDesde(fecha: string) {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

/**
 * Autoriza al dueño con su sesión, o al cron de n8n con el secreto compartido.
 * Sin uno de los dos, no se genera nada.
 */
async function autorizado(request: Request) {
  const secreto = request.headers.get("X-CRM-Secret");
  const { N8N_WEBHOOK_SECRET } = envServidor();
  // El cron no tiene sesión: se identifica con el secreto compartido.
  if (secreto && N8N_WEBHOOK_SECRET && secreto === N8N_WEBHOOK_SECRET) {
    return { permitido: true, profileId: null as string | null };
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { permitido: false, profileId: null };

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return {
    permitido: data?.role === "platform_admin",
    profileId: data?.role === "platform_admin" ? user.id : null,
  };
}

export async function POST(request: Request) {
  const quienPide = await autorizado(request);
  if (!quienPide.permitido) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  // El cron de n8n corre cada hora y llama con ?programado=1. La decisión de
  // si toca generarlo vive aquí, no en n8n: así cambiar la hora desde la
  // pantalla de configuración surte efecto sin tocar el workflow.
  const programado = new URL(request.url).searchParams.get("programado") === "1";

  const admin = crearClienteAdmin();

  const { data: ajustes } = await admin
    .from("llm_settings")
    .select(
      "provider, model, base_url, api_key_ciphertext, api_key_iv, api_key_tag, extra_instructions, daily_brief_enabled, daily_brief_hour"
    )
    .eq("is_active", true)
    .maybeSingle();

  if (programado) {
    if (!ajustes?.daily_brief_enabled) {
      return NextResponse.json({ omitido: "El resumen automático está apagado." });
    }

    const horaLocal = Number(
      new Intl.DateTimeFormat("es-MX", {
        hour: "numeric",
        hour12: false,
        timeZone: "America/Mexico_City",
      }).format(new Date())
    );

    if (horaLocal !== ajustes.daily_brief_hour) {
      return NextResponse.json({
        omitido: `Todavía no es la hora. Toca a las ${ajustes.daily_brief_hour}.`,
      });
    }
  }

  if (!ajustes) {
    return NextResponse.json(
      { error: "No hay un modelo activo. Configúralo en Configuración." },
      { status: 400 }
    );
  }

  const llaveObligatoria = necesitaLlave(ajustes.provider);

  if (llaveObligatoria && (!ajustes.api_key_ciphertext || !ajustes.api_key_iv || !ajustes.api_key_tag)) {
    return NextResponse.json(
      { error: "El modelo activo no tiene llave guardada. Captúrala en Configuración." },
      { status: 400 }
    );
  }

  // El resumen se guarda para quien lo pidió. Solo el cron, que no tiene
  // sesión, cae al primer administrador: elegirlo siempre así haría que un
  // segundo admin nunca viera el suyo.
  let profileId = quienPide.profileId;

  if (!profileId) {
    const { data: dueno } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "platform_admin")
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (!dueno) return NextResponse.json({ error: "No hay administrador." }, { status: 400 });
    profileId = dueno.id;
  }

  // Tareas abiertas, con sus notas privadas: ahí está el contexto real de por
  // qué algo está atorado, y por eso el brief se genera en el servidor.
  const [{ data: tareas }, { data: notas }] = await Promise.all([
    admin
      .from("v_board_tasks")
      .select(
        "id, title, status, priority, due_date, updated_at, task_type_name, project_name, end_client_name, organization_name"
      )
      .not("status", "in", "(hecho,cancelado)")
      .order("due_date", { nullsFirst: false })
      .limit(80),
    admin.from("task_private_notes").select("task_id, body, checklist"),
  ]);

  const notasPorTarea = new Map(
    (notas ?? []).map((n) => [n.task_id, n as { body: string; checklist: unknown }])
  );

  const lineas = ((tareas ?? []) as unknown as FilaTarea[]).map((t) => {
    const nota = notasPorTarea.get(t.id);
    const pendientes = Array.isArray(nota?.checklist)
      ? (nota.checklist as { text: string; done: boolean }[])
          .filter((p) => !p.done)
          .map((p) => p.text)
      : [];

    return [
      `- ${t.title}`,
      `  cliente: ${t.organization_name} / ${t.end_client_name} / ${t.project_name}`,
      `  tipo: ${t.task_type_name ?? "sin tipo"}, prioridad: ${ETIQUETA_PRIORIDAD[t.priority]}, estado: ${ETIQUETA_ESTADO[t.status]}`,
      `  entrega: ${t.due_date ? formatearFecha(t.due_date) : "sin fecha"}`,
      `  días sin movimiento: ${diasDesde(t.updated_at)}`,
      nota?.body ? `  notas privadas: ${nota.body.replace(/\s+/g, " ").slice(0, 600)}` : null,
      pendientes.length ? `  pendientes: ${pendientes.join("; ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  if (lineas.length === 0) {
    return NextResponse.json({ error: "No hay tareas abiertas que resumir." }, { status: 400 });
  }

  let apiKey: string | null = null;
  if (ajustes.api_key_ciphertext && ajustes.api_key_iv && ajustes.api_key_tag) {
    try {
      apiKey = descifrar(ajustes.api_key_ciphertext, ajustes.api_key_iv, ajustes.api_key_tag);
    } catch {
      return NextResponse.json(
        { error: "No se pudo descifrar la llave guardada. Captúrala de nuevo." },
        { status: 400 }
      );
    }
  }

  const hoy = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });

  const respuesta = await pedirAlModelo({
    proveedor: ajustes.provider as Proveedor,
    modelo: ajustes.model,
    baseUrl: ajustes.base_url,
    apiKey,
    sistema: ajustes.extra_instructions
      ? `${SISTEMA}\n\nInstrucciones adicionales del dueño:\n${ajustes.extra_instructions}`
      : SISTEMA,
    usuario: `Hoy es ${hoy}. Estas son mis tareas abiertas:\n\n${lineas.join("\n\n")}`,
  });

  if (!respuesta.ok) {
    return NextResponse.json({ error: respuesta.error }, { status: 502 });
  }

  const { error } = await admin.from("daily_briefs").upsert(
    {
      profile_id: profileId,
      brief_date: new Date().toISOString().slice(0, 10),
      model: ajustes.model,
      input_snapshot: { tareas: lineas.length },
      output_md: respuesta.texto,
      token_usage: (respuesta.uso ?? null) as never,
    },
    { onConflict: "profile_id,brief_date" }
  );

  if (error) {
    return NextResponse.json({ error: `No se pudo guardar el resumen: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tareas: lineas.length });
}
