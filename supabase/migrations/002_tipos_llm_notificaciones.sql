-- ============================================================================
--  CRM / Gestor de proyectos — Migración 002
--
--  Agrega:
--    - Tipos de tarea configurables por cliente (urgente, toma tiempo, etc.)
--    - Notas privadas tuyas por tarea (el cliente NUNCA las ve)
--    - Alta de usuario desde el sistema con contraseña temporal
--    - Configuración del LLM desde tu panel (API key cifrada)
--    - Brief diario generado por el LLM
--    - Log de correos enviados por n8n
--    - Payload enriquecido: n8n recibe todo listo, sin consultar de vuelta
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Configuración global adicional
-- ----------------------------------------------------------------------------
insert into public.app_config (key, value) values
  ('admin_email',  'tu-correo@dominio.com'),
  ('app_base_url', 'https://crm.tu-dominio.com')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Contraseña temporal en el alta
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column must_change_password boolean     not null default false,
  add column password_set_at      timestamptz,
  add column invited_at           timestamptz,
  add column last_seen_at         timestamptz;

comment on column public.profiles.must_change_password is
  'true cuando el usuario todavía trae la contraseña temporal del alta. '
  'El middleware de Next.js debe redirigir a /cambiar-password mientras sea true.';

-- ----------------------------------------------------------------------------
-- 3. Tipos de tarea (la lista de cada cliente)
-- ----------------------------------------------------------------------------
create table public.task_types (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  description      text,
  color            text not null default '#64748b',
  default_priority public.task_priority not null default 'media',
  expected_days    integer,          -- estimación base para sugerir due_date
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, name)
);

create index idx_task_types_org on public.task_types (organization_id, is_active);

create trigger trg_task_types_updated
  before update on public.task_types
  for each row execute function public.set_updated_at();

alter table public.tasks
  add column task_type_id uuid references public.task_types(id) on delete set null;

create index idx_tasks_type on public.tasks (task_type_id);

-- Cada organización nueva arranca con un catálogo base que puedes editar
create or replace function public.seed_task_types()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.task_types
    (organization_id, name, description, color, default_priority, expected_days, sort_order)
  values
    (new.id, 'Urgente',        'Bloquea al cliente, se atiende el mismo día', '#dc2626', 'urgente', 1, 1),
    (new.id, 'Cambio rápido',  'Ajuste menor de contenido o estilos',          '#f59e0b', 'alta',    2, 2),
    (new.id, 'Desarrollo',     'Funcionalidad nueva, requiere estimación',     '#2563eb', 'media',  10, 3),
    (new.id, 'Automatización', 'Flujo n8n, integración o API',                 '#7c3aed', 'media',   7, 4),
    (new.id, 'Rendimiento',    'Optimización y Core Web Vitals',               '#0d9488', 'media',   5, 5),
    (new.id, 'Mantenimiento',  'Actualizaciones, respaldos, revisiones',       '#64748b', 'baja',    3, 6)
  on conflict (organization_id, name) do nothing;
  return new;
end;
$$;

create trigger trg_organizations_seed_types
  after insert on public.organizations
  for each row execute function public.seed_task_types();

-- ----------------------------------------------------------------------------
-- 4. Notas privadas del admin
--    Tabla aparte a propósito: RLS filtra filas, no columnas. Si esto viviera
--    como columna de tasks, el cliente la leería con la llave anon.
-- ----------------------------------------------------------------------------
create table public.task_private_notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id         uuid not null references public.tasks(id) on delete cascade,
  author_id       uuid references public.profiles(id) on delete set null,
  body            text not null default '',   -- markdown con tus viñetas
  checklist       jsonb not null default '[]'::jsonb,
                  -- [{"id":"1","text":"revisar accesos FTP","done":false}, ...]
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (task_id)
);

create index idx_private_notes_task on public.task_private_notes (task_id);

create trigger trg_private_notes_updated
  before update on public.task_private_notes
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Configuración del LLM
--    La API key se cifra en Next.js (AES-256-GCM) antes de tocar la base.
--    Postgres solo guarda ciphertext. Ni tú la vuelves a ver completa.
-- ----------------------------------------------------------------------------
create table public.llm_settings (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null,              -- 'anthropic' | 'openai' | 'google' | 'ollama'
  model              text not null,
  base_url           text,                       -- para Ollama u otro compatible
  api_key_ciphertext text,
  api_key_iv         text,
  api_key_tag        text,
  api_key_last4      text,                       -- lo único que se muestra en la UI
  is_active          boolean not null default false,
  daily_brief_hour   smallint not null default 8 check (daily_brief_hour between 0 and 23),
  daily_brief_enabled boolean not null default false,
  extra_instructions text,                       -- tu prompt de sistema personalizado
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (provider)
);

alter table public.llm_settings enable row level security;
-- Sin políticas: solo service_role. La UI lee por la función de abajo.

create trigger trg_llm_settings_updated
  before update on public.llm_settings
  for each row execute function public.set_updated_at();

-- Lectura segura para tu panel: nunca devuelve el ciphertext
create or replace function public.get_llm_settings()
returns table (
  id uuid,
  provider text,
  model text,
  base_url text,
  api_key_last4 text,
  has_key boolean,
  is_active boolean,
  daily_brief_hour smallint,
  daily_brief_enabled boolean,
  extra_instructions text
)
language sql stable security definer set search_path = public
as $$
  select s.id, s.provider, s.model, s.base_url, s.api_key_last4,
         (s.api_key_ciphertext is not null) as has_key,
         s.is_active, s.daily_brief_hour, s.daily_brief_enabled, s.extra_instructions
  from public.llm_settings s
  where public.is_platform_admin();
$$;

revoke all on function public.get_llm_settings() from public;
grant execute on function public.get_llm_settings() to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Brief diario
-- ----------------------------------------------------------------------------
create table public.daily_briefs (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  brief_date   date not null default current_date,
  model        text,
  input_snapshot jsonb not null default '{}'::jsonb,  -- qué tareas se le pasaron
  output_md    text,
  token_usage  jsonb,
  created_at   timestamptz not null default now(),
  unique (profile_id, brief_date)
);

alter table public.daily_briefs enable row level security;

create policy briefs_own on public.daily_briefs
  for all to authenticated
  using (profile_id = auth.uid() and public.is_platform_admin())
  with check (profile_id = auth.uid() and public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 7. Log de correos (lo escribe n8n con service_role)
-- ----------------------------------------------------------------------------
create table public.email_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  task_id         uuid references public.tasks(id) on delete set null,
  event           text not null,
  audience        text not null check (audience in ('admin', 'client')),
  recipient_email text not null,
  subject         text,
  status          text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error_message   text,
  created_at      timestamptz not null default now()
);

create index idx_email_log_task on public.email_log (task_id, created_at desc);

alter table public.email_log enable row level security;

create policy email_log_admin_read on public.email_log
  for select to authenticated
  using (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 8. RLS de las tablas nuevas
-- ----------------------------------------------------------------------------
alter table public.task_types         enable row level security;
alter table public.task_private_notes enable row level security;

-- 8.1 task_types: tú los administras, el cliente los lee para elegir al crear
create policy task_types_admin_all on public.task_types
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy task_types_member_read on public.task_types
  for select to authenticated
  using (organization_id in (select public.my_org_ids()));

-- 8.2 task_private_notes: exclusivo tuyo, sin excepción
create policy private_notes_admin_only on public.task_private_notes
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 9. Payload enriquecido para n8n
--    Trae nombres, correos y destinatarios ya resueltos para que n8n no tenga
--    que regresar a consultar la base. Un solo evento por update, con la lista
--    de campos que cambiaron, para no mandar dos correos por la misma acción.
-- ----------------------------------------------------------------------------
create or replace function public.build_task_payload(
  p_task       public.tasks,
  p_event      text,
  p_changes    jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_org        public.organizations;
  v_project    public.projects;
  v_end_client public.end_clients;
  v_type_name  text;
  v_actor      jsonb;
  v_client_emails text[];
  v_base_url   text;
  v_admin_mail text;
begin
  select * into v_org        from public.organizations where id = p_task.organization_id;
  select * into v_project    from public.projects      where id = p_task.project_id;
  select * into v_end_client from public.end_clients   where id = v_project.end_client_id;
  select name into v_type_name from public.task_types  where id = p_task.task_type_id;

  select jsonb_build_object('id', p.id, 'name', p.full_name, 'email', p.email, 'role', p.role)
    into v_actor
    from public.profiles p
   where p.id = coalesce(auth.uid(), p_task.created_by);

  select array_agg(distinct p.email)
    into v_client_emails
    from public.memberships m
    join public.profiles p on p.id = m.profile_id
   where m.organization_id = p_task.organization_id;

  select value into v_base_url   from public.app_config where key = 'app_base_url';
  select value into v_admin_mail from public.app_config where key = 'admin_email';

  return jsonb_build_object(
    'event',   p_event,
    'changes', p_changes,
    'actor',   v_actor,
    'task', jsonb_build_object(
      'id',          p_task.id,
      'title',       p_task.title,
      'description', p_task.description,
      'status',      p_task.status,
      'priority',    p_task.priority,
      'type',        v_type_name,
      'due_date',    p_task.due_date,
      'url',         coalesce(v_base_url, '') || '/tareas/' || p_task.id
    ),
    'project',     jsonb_build_object('id', v_project.id, 'name', v_project.name),
    'end_client',  jsonb_build_object('id', v_end_client.id,
                                      'name', v_end_client.name,
                                      'company', v_end_client.company),
    'organization',jsonb_build_object('id', v_org.id, 'name', v_org.name),
    'recipients',  jsonb_build_object(
      'admin',  coalesce(v_admin_mail, ''),
      'client', coalesce(to_jsonb(v_client_emails), '[]'::jsonb)
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 10. Trigger de eventos, reescrito
-- ----------------------------------------------------------------------------
drop trigger if exists trg_tasks_notify_insert on public.tasks;
drop trigger if exists trg_tasks_notify_update on public.tasks;

create or replace function public.emit_task_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_url     text;
  v_secret  text;
  v_event   text;
  v_changes jsonb := '[]'::jsonb;
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_event := 'task.created';
  else
    -- Un solo evento con todo lo que cambió, para no duplicar correos
    if new.status      is distinct from old.status then
      v_changes := v_changes || jsonb_build_object(
        'field', 'status', 'from', old.status, 'to', new.status);
    end if;
    if new.due_date    is distinct from old.due_date then
      v_changes := v_changes || jsonb_build_object(
        'field', 'due_date', 'from', old.due_date, 'to', new.due_date);
    end if;
    if new.priority    is distinct from old.priority then
      v_changes := v_changes || jsonb_build_object(
        'field', 'priority', 'from', old.priority, 'to', new.priority);
    end if;
    if new.assigned_to is distinct from old.assigned_to then
      v_changes := v_changes || jsonb_build_object('field', 'assigned_to');
    end if;
    if new.title       is distinct from old.title then
      v_changes := v_changes || jsonb_build_object('field', 'title');
    end if;

    if jsonb_array_length(v_changes) = 0 then
      return new;   -- edición irrelevante, no molestamos a nadie
    end if;

    v_event := 'task.updated';
  end if;

  v_payload := public.build_task_payload(new, v_event, v_changes);

  insert into public.task_events (organization_id, task_id, actor_id, event_type, payload)
  values (new.organization_id, new.id, auth.uid(), v_event, v_payload);

  select value into v_url    from public.app_config where key = 'n8n_webhook_url';
  select value into v_secret from public.app_config where key = 'n8n_webhook_secret';

  if v_url is not null then
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'X-CRM-Secret', coalesce(v_secret, '')
                 ),
      body    := v_payload
    );
  end if;

  return new;
end;
$$;

create trigger trg_tasks_notify_insert
  after insert on public.tasks
  for each row execute function public.emit_task_event();

create trigger trg_tasks_notify_update
  after update on public.tasks
  for each row execute function public.emit_task_event();

-- 10.1 Comentarios también notifican
create or replace function public.emit_comment_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_task    public.tasks;
  v_url     text;
  v_secret  text;
  v_payload jsonb;
begin
  select * into v_task from public.tasks where id = new.task_id;

  v_payload := public.build_task_payload(v_task, 'comment.created', '[]'::jsonb)
               || jsonb_build_object('comment', jsonb_build_object(
                    'id', new.id, 'body', new.body, 'author_id', new.author_id));

  select value into v_url    from public.app_config where key = 'n8n_webhook_url';
  select value into v_secret from public.app_config where key = 'n8n_webhook_secret';

  if v_url is not null then
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'X-CRM-Secret', coalesce(v_secret, '')
                 ),
      body    := v_payload
    );
  end if;

  return new;
end;
$$;

create trigger trg_comments_notify
  after insert on public.comments
  for each row execute function public.emit_comment_event();

-- ----------------------------------------------------------------------------
-- 11. Vista de tablero para tu dashboard
--     Un kanban por cliente, con filtro por proyecto del lado de la app.
-- ----------------------------------------------------------------------------
create or replace view public.v_board_tasks
with (security_invoker = true) as
select
  t.id,
  t.organization_id,
  o.name  as organization_name,
  t.project_id,
  p.name  as project_name,
  p.color as project_color,
  ec.id   as end_client_id,
  ec.name as end_client_name,
  t.task_type_id,
  tt.name  as task_type_name,
  tt.color as task_type_color,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.sort_order,
  t.due_date,
  t.completed_at,
  t.created_by,
  cb.full_name as created_by_name,
  t.assigned_to,
  t.created_at,
  t.updated_at,
  (select count(*) from public.comments c where c.task_id = t.id)    as comment_count,
  (select count(*) from public.attachments a where a.task_id = t.id) as attachment_count,
  (t.due_date is not null and t.due_date < current_date
     and t.status not in ('hecho','cancelado'))                      as is_overdue
from public.tasks t
join public.organizations o on o.id = t.organization_id
join public.projects      p on p.id = t.project_id
join public.end_clients  ec on ec.id = p.end_client_id
left join public.task_types tt on tt.id = t.task_type_id
left join public.profiles   cb on cb.id = t.created_by;

-- security_invoker = true hace que la vista respete el RLS de quien consulta.
-- Sin eso, la vista correría como su dueño y filtraría datos entre clientes.

alter publication supabase_realtime add table public.task_types;

commit;

-- ============================================================================
--  NOTAS DE IMPLEMENTACIÓN
-- ============================================================================
--
--  ALTA DE CLIENTE (endpoint /api/clientes, service_role, solo admin):
--    1. insert en organizations           → dispara el seed de task_types
--    2. genera contraseña temporal        → crypto.randomBytes, 16 chars
--    3. auth.admin.createUser({ email, password, email_confirm: true })
--    4. update profiles set must_change_password = true, invited_at = now()
--    5. insert en memberships (profile_id, organization_id, 'client_owner')
--    6. POST al webhook de n8n con evento 'user.created' y la contraseña
--       EN CLARO UNA SOLA VEZ, en la respuesta del paso 3. No se guarda
--       en ninguna tabla, no se escribe en logs.
--    7. El middleware de Next.js redirige a /cambiar-password mientras
--       must_change_password sea true. Al cambiarla: false + password_set_at.
--
--  CIFRADO DE LA API KEY DEL LLM:
--    - Variable de entorno CRM_ENCRYPTION_KEY, 32 bytes en base64.
--    - AES-256-GCM en el Route Handler. Guardas ciphertext, iv, tag y last4.
--    - El descifrado ocurre solo en el servidor, al llamar al LLM.
--    - Si pierdes CRM_ENCRYPTION_KEY, la key es irrecuperable y hay que
--      volver a capturarla. Respáldala aparte de la base de datos.
--
-- ============================================================================
