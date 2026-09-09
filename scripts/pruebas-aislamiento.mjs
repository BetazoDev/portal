/**
 * Pruebas de aislamiento — sección 13 del documento.
 *
 *   node --env-file=.env.local scripts/pruebas-aislamiento.mjs
 *
 * Monta dos organizaciones de prueba con un usuario cada una, entra con las
 * sesiones REALES de esos usuarios y comprueba que ninguno alcanza los datos
 * del otro. Al terminar borra todo lo que creó.
 *
 * La service_role solo se usa para el montaje y la limpieza. Las diez pruebas
 * corren con la llave anon y una sesión de verdad: con service_role todas
 * pasarían en falso, porque esa llave se salta RLS.
 */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("Faltan variables. Corre con: node --env-file=.env.local scripts/pruebas-aislamiento.mjs");
  process.exit(1);
}

const PREFIJO = "prueba-aislamiento";
const PASSWORD = "Prueba-Aislamiento-2026!";

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const resultados = [];
function comprobar(numero, nombre, esperado, ok, obtenido) {
  resultados.push({ numero, nombre, esperado, ok, obtenido });
}

/** Sesión real de un usuario: llave anon más su propio token. */
async function sesionDe(email) {
  const cliente = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await cliente.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`No se pudo entrar como ${email}: ${error.message}`);
  return cliente;
}

async function crearUsuario(email, { esAdmin = false } = {}) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`No se pudo crear ${email}: ${error.message}`);

  if (esAdmin) {
    const { error: e } = await admin
      .from("profiles")
      .update({ role: "platform_admin" })
      .eq("id", data.user.id);
    if (e) throw new Error(`No se pudo promover ${email}: ${e.message}`);
  }
  return data.user.id;
}

async function montarOrganizacion(letra, perfilId) {
  const { data: org, error: eOrg } = await admin
    .from("organizations")
    .insert({ name: `Prueba aislamiento ${letra}`, slug: `${PREFIJO}-${letra.toLowerCase()}` })
    .select("id")
    .single();
  if (eOrg) throw new Error(`org ${letra}: ${eOrg.message}`);

  const { error: eMem } = await admin
    .from("memberships")
    .insert({ profile_id: perfilId, organization_id: org.id, role: "client_owner" });
  if (eMem) throw new Error(`membresía ${letra}: ${eMem.message}`);

  const { data: cliente, error: eCli } = await admin
    .from("end_clients")
    .insert({ organization_id: org.id, name: `Cliente final ${letra}` })
    .select("id")
    .single();
  if (eCli) throw new Error(`cliente final ${letra}: ${eCli.message}`);

  const { data: proyecto, error: ePro } = await admin
    .from("projects")
    .insert({ organization_id: org.id, end_client_id: cliente.id, name: `Proyecto ${letra}` })
    .select("id")
    .single();
  if (ePro) throw new Error(`proyecto ${letra}: ${ePro.message}`);

  const { data: tarea, error: eTar } = await admin
    .from("tasks")
    .insert({
      organization_id: org.id,
      project_id: proyecto.id,
      title: `Tarea ${letra}`,
      status: "nuevo",
      created_by: perfilId,
    })
    .select("id")
    .single();
  if (eTar) throw new Error(`tarea ${letra}: ${eTar.message}`);

  // Nota privada del dueño sobre esta tarea. El cliente no debe verla jamás.
  const { error: eNota } = await admin.from("task_private_notes").insert({
    organization_id: org.id,
    task_id: tarea.id,
    body: `Nota privada de ${letra}. Si esto se ve desde el portal, hay una fuga.`,
  });
  if (eNota) throw new Error(`nota privada ${letra}: ${eNota.message}`);

  return { orgId: org.id, tareaId: tarea.id, proyectoId: proyecto.id };
}

async function limpiar(ids) {
  // Las organizaciones caen en cascada y se llevan clientes, proyectos,
  // tareas, notas y adjuntos. Los usuarios y el ajuste del LLM van aparte.
  await admin.storage.from("task-attachments").remove(ids.rutasStorage ?? []);
  await admin.from("organizations").delete().like("slug", `${PREFIJO}-%`);
  await admin.from("llm_settings").delete().eq("provider", `${PREFIJO}-proveedor`);
  for (const id of ids.usuarios ?? []) {
    await admin.auth.admin.deleteUser(id);
  }
}

async function principal() {
  const ids = { usuarios: [], rutasStorage: [] };

  try {
    // ---------------------------------------------------------------- montaje
    await limpiar({ usuarios: [] }); // por si una corrida anterior se cayó a media

    const emailA = `${PREFIJO}-a@example.com`;
    const emailB = `${PREFIJO}-b@example.com`;
    const emailAdmin = `${PREFIJO}-admin@example.com`;

    // Si quedaron usuarios de una corrida anterior, se van antes de recrearlos.
    const { data: existentes } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of existentes?.users ?? []) {
      if (u.email?.startsWith(PREFIJO)) await admin.auth.admin.deleteUser(u.id);
    }

    const usuarioA = await crearUsuario(emailA);
    const usuarioB = await crearUsuario(emailB);
    const usuarioAdmin = await crearUsuario(emailAdmin, { esAdmin: true });
    ids.usuarios.push(usuarioA, usuarioB, usuarioAdmin);

    const A = await montarOrganizacion("A", usuarioA);
    const B = await montarOrganizacion("B", usuarioB);

    // Un ajuste de LLM para que la prueba 5 signifique algo: si la tabla
    // estuviera vacía, cero filas no probaría nada.
    await admin.from("llm_settings").insert({
      provider: `${PREFIJO}-proveedor`,
      model: "modelo-de-prueba",
      api_key_ciphertext: "cifrado-falso",
      api_key_last4: "9999",
    });

    // Un archivo dentro del espacio de B, para intentar bajarlo desde A.
    const rutaB = `${B.orgId}/${B.tareaId}/secreto-de-b.txt`;
    await admin.storage
      .from("task-attachments")
      .upload(rutaB, new Blob(["contenido privado de B"]), { upsert: true });
    ids.rutasStorage.push(rutaB);

    const sesionA = await sesionDe(emailA);
    const sesionAdmin = await sesionDe(emailAdmin);

    // ---------------------------------------------------------------- pruebas

    // 1. A consulta tasks
    {
      const { data } = await sesionA.from("tasks").select("id, organization_id");
      const soloDeA = data?.length === 1 && data[0].organization_id === A.orgId;
      comprobar(1, "Usuario A consulta tasks", "Solo filas de A", soloDeA, `${data?.length ?? 0} fila(s)`);
    }

    // 2. A consulta la tarea de B por ID directo
    {
      const { data } = await sesionA.from("tasks").select("id").eq("id", B.tareaId);
      comprobar(2, "A pide la tarea de B por ID", "0 filas", (data?.length ?? 0) === 0, `${data?.length ?? 0} fila(s)`);
    }

    // 3. A intenta cambiar el estado de su propia tarea
    {
      const { error } = await sesionA.from("tasks").update({ status: "en_progreso" }).eq("id", A.tareaId);
      comprobar(3, "A cambia el estado de su tarea", "Error 42501", error?.code === "42501", error ? `${error.code}` : "sin error");
    }

    // 4. A consulta task_private_notes
    {
      const { data } = await sesionA.from("task_private_notes").select("id, body");
      comprobar(4, "A consulta notas privadas", "0 filas", (data?.length ?? 0) === 0, `${data?.length ?? 0} fila(s)`);
    }

    // 5. A consulta llm_settings
    {
      const { data } = await sesionA.from("llm_settings").select("id");
      comprobar(5, "A consulta llm_settings", "0 filas", (data?.length ?? 0) === 0, `${data?.length ?? 0} fila(s)`);
    }

    // 6. A baja un archivo de B por ruta directa
    {
      const { data, error } = await sesionA.storage.from("task-attachments").download(rutaB);
      comprobar(6, "A baja un archivo de B", "Denegado", !data && !!error, error ? "denegado" : "descargó el archivo");
    }

    // 7. A consulta organizations
    {
      const { data } = await sesionA.from("organizations").select("id");
      const soloLaSuya = data?.length === 1 && data[0].id === A.orgId;
      comprobar(7, "A consulta organizations", "Solo la suya", soloLaSuya, `${data?.length ?? 0} fila(s)`);
    }

    // 8. El admin ve todo lo anterior.
    //    Se comprueba que alcanza las filas de A Y las de B, no un total exacto:
    //    la base puede tener datos reales y el conteo no probaría nada.
    {
      const [tareas, notas, orgs, ajustes] = await Promise.all([
        sesionAdmin.from("tasks").select("id").in("id", [A.tareaId, B.tareaId]),
        sesionAdmin.from("task_private_notes").select("id, task_id").in("task_id", [A.tareaId, B.tareaId]),
        sesionAdmin.from("organizations").select("id").in("id", [A.orgId, B.orgId]),
        sesionAdmin.rpc("get_llm_settings"),
      ]);
      const completo =
        (tareas.data?.length ?? 0) === 2 &&
        (notas.data?.length ?? 0) === 2 &&
        (orgs.data?.length ?? 0) === 2 &&
        (ajustes.data?.length ?? 0) >= 1;
      comprobar(
        8,
        "El admin consulta todo lo anterior",
        "Ve las dos organizaciones",
        completo,
        `${tareas.data?.length ?? 0}/2 tareas, ${notas.data?.length ?? 0}/2 notas, ${orgs.data?.length ?? 0}/2 orgs, ${ajustes.data?.length ?? 0} ajustes`
      );

      // La API key nunca sale completa, ni siquiera para el admin.
      const fila = ajustes.data?.find((f) => f.provider === `${PREFIJO}-proveedor`);
      const sinCiphertext = fila && !("api_key_ciphertext" in fila) && fila.api_key_last4 === "9999";
      comprobar(
        "8b",
        "get_llm_settings no devuelve la llave",
        "Solo los últimos 4",
        !!sinCiphertext,
        fila ? Object.keys(fila).join(", ") : "sin fila"
      );
    }

    // 9. Se comprueba con el navegador contra la app corriendo. Ver el informe.

    // 10. v_board_tasks desde la sesión de A
    {
      const { data } = await sesionA.from("v_board_tasks").select("id, organization_id");
      const soloDeA = data?.length === 1 && data[0].organization_id === A.orgId;
      comprobar(10, "v_board_tasks desde la sesión de A", "Solo tareas de A", soloDeA, `${data?.length ?? 0} fila(s)`);
    }

    // 11. ¿Puede A ascenderse a administrador? RLS filtra filas, no columnas,
    //     así que sin el candado de la migración 004 esto pasaba.
    {
      const { error } = await sesionA.from("profiles").update({ role: "platform_admin" }).eq("id", usuarioA);
      const { data: perfil } = await admin.from("profiles").select("role").eq("id", usuarioA).single();
      const bloqueado = perfil?.role !== "platform_admin";
      comprobar(
        11,
        "A intenta ascenderse a platform_admin",
        "Error 42501, sigue sin ser admin",
        bloqueado && error?.code === "42501",
        `rol = ${perfil?.role}${error ? ` (error ${error.code})` : " (sin error)"}`
      );
    }

    // 11b. Una tarea que ya salió de "Nuevas" queda fuera del alcance del cliente.
    //      Aquí RLS no devuelve error: simplemente no encuentra la fila, y el
    //      update afecta cero filas. Comprobar el error no basta; hay que
    //      comprobar que la tarea no se movió.
    {
      await admin.from("tasks").update({ status: "en_progreso" }).eq("id", A.tareaId);

      const { data: afectadas } = await sesionA
        .from("tasks")
        .update({ status: "hecho" })
        .eq("id", A.tareaId)
        .select();

      const { data: despues } = await admin
        .from("tasks")
        .select("status")
        .eq("id", A.tareaId)
        .single();

      comprobar(
        "11b",
        "A mueve una tarea que ya no está en Nuevas",
        "0 filas afectadas, sigue igual",
        (afectadas?.length ?? 0) === 0 && despues?.status === "en_progreso",
        `${afectadas?.length ?? 0} fila(s), estado = ${despues?.status}`
      );

      await admin.from("tasks").update({ status: "nuevo" }).eq("id", A.tareaId);
    }

    // 12. El candado no puede estorbar lo legítimo: su propio nombre sí lo cambia.
    {
      const { error } = await sesionA.from("profiles").update({ full_name: "Nombre nuevo" }).eq("id", usuarioA);
      const { data: perfil } = await admin.from("profiles").select("full_name").eq("id", usuarioA).single();
      comprobar(
        12,
        "A cambia su propio nombre",
        "Se guarda",
        !error && perfil?.full_name === "Nombre nuevo",
        error ? `error ${error.code}` : `full_name = ${perfil?.full_name}`
      );
    }

    // 13. Y tampoco puede quitarse el cambio de contraseña obligatorio.
    {
      await admin.from("profiles").update({ must_change_password: true }).eq("id", usuarioA);
      const { error } = await sesionA
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", usuarioA);
      const { data: perfil } = await admin
        .from("profiles")
        .select("must_change_password")
        .eq("id", usuarioA)
        .single();
      comprobar(
        13,
        "A se salta el cambio de contraseña",
        "Error 42501, sigue obligado",
        perfil?.must_change_password === true && error?.code === "42501",
        `must_change_password = ${perfil?.must_change_password}${error ? ` (error ${error.code})` : " (sin error)"}`
      );
    }
    // 14. Archivar tiene que cortar el acceso de verdad, no ser una etiqueta.
    //     Antes de la migración 006 este estado no lo miraba ninguna política:
    //     archivabas una agencia y su gente seguía entrando como si nada.
    {
      await admin.from("organizations").update({ status: "archivado" }).eq("id", A.orgId);

      const [{ data: tareas }, { data: orgs }, { data: tablero }] = await Promise.all([
        sesionA.from("tasks").select("id"),
        sesionA.from("organizations").select("id"),
        sesionA.from("v_board_tasks").select("id"),
      ]);

      comprobar(
        14,
        "A entra con su agencia archivada",
        "0 filas en todo",
        tareas?.length === 0 && orgs?.length === 0 && tablero?.length === 0,
        `${tareas?.length ?? "?"} tareas, ${orgs?.length ?? "?"} orgs, ${tablero?.length ?? "?"} en el tablero`
      );
    }

    // 14b. Y tiene que ser reversible: reactivar devuelve el acceso.
    {
      await admin.from("organizations").update({ status: "activo" }).eq("id", A.orgId);
      const { data } = await sesionA.from("tasks").select("id");
      comprobar(
        "14b",
        "A vuelve tras reactivar la agencia",
        "Ve otra vez su tarea",
        data?.length === 1,
        `${data?.length ?? "?"} fila(s)`
      );
    }

    // 14c. "pausado" es un alto temporal, no una baja: no debe cortar nada.
    //      Si algún día alguien lo mete en el filtro de my_org_ids(), esto avisa.
    {
      await admin.from("organizations").update({ status: "pausado" }).eq("id", A.orgId);
      const { data } = await sesionA.from("tasks").select("id");
      await admin.from("organizations").update({ status: "activo" }).eq("id", A.orgId);
      comprobar(
        "14c",
        "A entra con su agencia pausada",
        "Sigue viendo su tarea",
        data?.length === 1,
        `${data?.length ?? "?"} fila(s)`
      );
    }
    // 15. El bucket tiene que rechazar los tipos que no están en la lista.
    //     Antes de la migración 007 entraba cualquier cosa: el único filtro
    //     vivía en el navegador, y un cliente con su token lo salta.
    {
      const cuerpo = new Blob(["MZ"], { type: "application/x-msdownload" });
      const { error } = await sesionA.storage
        .from("task-attachments")
        .upload(`${A.orgId}/${A.tareaId}/prueba.exe`, cuerpo, {
          contentType: "application/x-msdownload",
        });

      comprobar(
        15,
        "A sube un ejecutable",
        "Rechazado por el bucket",
        !!error,
        error ? `rechazado: ${error.message}` : "SE SUBIÓ"
      );
    }

    // 15b. Y tiene que seguir aceptando lo legítimo, dentro de su carpeta.
    {
      const ruta = `${A.orgId}/${A.tareaId}/prueba.png`;
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      const { error } = await sesionA.storage
        .from("task-attachments")
        .upload(ruta, png, { contentType: "image/png" });

      comprobar(
        "15b",
        "A sube un PNG a su propia carpeta",
        "Se acepta",
        !error,
        error ? `rechazado: ${error.message}` : "subido"
      );

      if (!error) await admin.storage.from("task-attachments").remove([ruta]);
    }
  } finally {
    await limpiar(ids);
  }

  // ------------------------------------------------------------------ informe
  const ancho = Math.max(...resultados.map((r) => r.nombre.length));
  console.log();
  for (const r of resultados) {
    const marca = r.ok ? "PASA" : "FALLA";
    console.log(
      `${String(r.numero).padStart(5)}  ${marca.padEnd(5)}  ${r.nombre.padEnd(ancho)}  esperado: ${r.esperado}  ·  obtenido: ${r.obtenido}`
    );
  }

  const fallidas = resultados.filter((r) => !r.ok);
  console.log();
  console.log(
    fallidas.length === 0
      ? `Las ${resultados.length} pruebas pasan. Datos de prueba borrados.`
      : `${fallidas.length} de ${resultados.length} fallan.`
  );
  process.exit(fallidas.length === 0 ? 0 : 1);
}

principal().catch((e) => {
  console.error("La corrida se cayó:", e.message);
  process.exit(1);
});
