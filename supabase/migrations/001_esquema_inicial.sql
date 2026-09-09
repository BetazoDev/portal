-- ============================================================================
--  CRM / Gestor de proyectos — Migración 001: esquema inicial
--  Supabase self-hosted (Postgres 15+) sobre Dokploy
--
--  Jerarquía:
--    platform_admin (tú)
--      └── organizations        = tus clientes (agencias)
--            └── end_clients    = los clientes de tus clientes
--                  └── projects
--                        └── tasks
--
--  Reglas de acceso:
--    - platform_admin ve y modifica todo.
--    - Un miembro de organización solo ve SU organización. Nunca otra.
--    - El cliente puede crear tareas y ver el kanban completo,
--      pero NO puede cambiar estado, orden, proyecto ni asignación.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Extensiones
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists pg_net;   -- necesaria para los webhooks a n8n

-- ----------------------------------------------------------------------------
-- 2. Tipos
-- ----------------------------------------------------------------------------
create type public.app_role as enum (
  'platform_admin',   -- tú
  'client_owner',     -- dueño de la agencia
  'client_member'     -- alguien más de su equipo
);

create type public.org_status     as enum ('activo', 'pausado', 'archivado');
create type public.project_status as enum ('activo', 'pausado', 'terminado', 'archivado');
create type public.task_priority  as enum ('baja', 'media', 'alta', 'urgente');

-- Columnas del kanban. El orden del enum es el orden del tablero.
create type public.task_status as enum (
  'nuevo',              -- bandeja de entrada: aquí cae lo que manda el cliente
  'en_revision',        -- lo estás evaluando
  'en_progreso',
  'esperando_cliente',  -- bloqueado por falta de info o accesos
  'hecho',
  'cancelado'
);

-- ----------------------------------------------------------------------------
-- 3. Configuración interna (solo accesible con service_role)
-- ----------------------------------------------------------------------------
create table public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
-- Sin políticas a propósito: ningún usuario autenticado puede leerla.

insert into public.app_config (key, value) values
  ('n8n_webhook_url',    'https://n8n.tu-dominio.tech/webhook/crm-events'),
  ('n8n_webhook_secret', 'CAMBIA_ESTE_VALOR')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Utilidad: updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Tablas
-- ----------------------------------------------------------------------------

-- 5.1 Perfiles (espejo de auth.users)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text,
  role       public.app_role not null default 'client_member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 5.2 Organizaciones = tus clientes
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  status        public.org_status not null default 'activo',
  contact_email text,
  contact_phone text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_organizations_updated
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- 5.3 Membresías
create table public.memberships (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id)      on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role            public.app_role not null default 'client_member',
  created_at      timestamptz not null default now(),
  unique (profile_id, organization_id)
);

create index idx_memberships_profile on public.memberships (profile_id);
create index idx_memberships_org     on public.memberships (organization_id);

-- 5.4 Invitaciones pendientes
-- Creas la org y dejas la invitación aquí. Cuando la persona acepta el correo
-- de Supabase y define su contraseña, el trigger la convierte en membresía.
create table public.pending_invitations (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role            public.app_role not null default 'client_owner',
  invited_by      uuid references public.profiles(id) on delete set null,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (email, organization_id)
);

-- 5.5 Clientes finales (los clientes de tu cliente)
create table public.end_clients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  company         text,
  email           text,
  phone           text,
  website         text,
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_end_clients_org on public.end_clients (organization_id);

create trigger trg_end_clients_updated
  before update on public.end_clients
  for each row execute function public.set_updated_at();

-- 5.6 Proyectos
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  end_client_id   uuid not null references public.end_clients(id)   on delete cascade,
  name            text not null,
  description     text,
  status          public.project_status not null default 'activo',
  color           text,          -- para distinguirlo en el kanban del cliente
  start_date      date,
  due_date        date,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_projects_org        on public.projects (organization_id);
create index idx_projects_end_client on public.projects (end_client_id);

create trigger trg_projects_updated
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 5.7 Tareas
create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid not null references public.projects(id)      on delete cascade,
  title           text not null,
  description     text,
  status          public.task_status   not null default 'nuevo',
  priority        public.task_priority not null default 'media',
  sort_order      double precision     not null default 1000,  -- indexado fraccionario
  created_by      uuid references public.profiles(id) on delete set null,
  assigned_to     uuid references public.profiles(id) on delete set null,
  due_date        date,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_tasks_org        on public.tasks (organization_id);
create index idx_tasks_project    on public.tasks (project_id);
create index idx_tasks_board      on public.tasks (organization_id, status, sort_order);
create index idx_tasks_created_by on public.tasks (created_by);

create trigger trg_tasks_updated
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- 5.8 Comentarios
create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id         uuid not null references public.tasks(id)         on delete cascade,
  author_id       uuid references public.profiles(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_comments_task on public.comments (task_id);

create trigger trg_comments_updated
  before update on public.comments
  for each row execute function public.set_updated_at();

-- 5.9 Adjuntos (bucket privado de Supabase Storage)
create table public.attachments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id         uuid not null references public.tasks(id)         on delete cascade,
  storage_path    text not null,
  file_name       text not null,
  mime_type       text,
  size_bytes      bigint,
  uploaded_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_attachments_task on public.attachments (task_id);

-- 5.10 Bitácora de actividad (se escribe sola, nadie la edita)
create table public.task_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id         uuid not null references public.tasks(id)         on delete cascade,
  actor_id        uuid references public.profiles(id) on delete set null,
  event_type      text not null,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_task_events_task on public.task_events (task_id, created_at desc);

-- 5.11 Notificaciones en producto (la campanita)
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text,
  link            text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_notifications_recipient
  on public.notifications (recipient_id, read_at, created_at desc);

-- ----------------------------------------------------------------------------
-- 6. Funciones de apoyo para RLS
--    SECURITY DEFINER es obligatorio: si la política consultara memberships
--    directamente, RLS se llamaría a sí misma y entraría en recursión.
-- ----------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'platform_admin'
  );
$$;

create or replace function public.my_org_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select organization_id from public.memberships where profile_id = auth.uid();
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.my_org_ids()        from public;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.my_org_ids()        to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Alta de usuario: perfil + conversión de invitación en membresía
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.memberships (profile_id, organization_id, role)
  select new.id, i.organization_id, i.role
  from public.pending_invitations i
  where lower(i.email) = lower(new.email)
    and i.accepted_at is null
  on conflict (profile_id, organization_id) do nothing;

  update public.pending_invitations
     set accepted_at = now()
   where lower(email) = lower(new.email)
     and accepted_at is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 8. Candado: el cliente no mueve tarjetas
--    RLS no restringe columnas, así que el bloqueo va en trigger.
-- ----------------------------------------------------------------------------
create or replace function public.guard_task_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- service_role y trabajos internos no tienen auth.uid()
  if auth.uid() is null or public.is_platform_admin() then
    return new;
  end if;

  if new.status      is distinct from old.status
  or new.sort_order  is distinct from old.sort_order
  or new.project_id  is distinct from old.project_id
  or new.assigned_to is distinct from old.assigned_to then
    raise exception 'Solo el administrador puede mover, reasignar o cambiar el estado de una tarea'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_tasks_guard
  before update on public.tasks
  for each row execute function public.guard_task_update();

-- Marca completed_at automáticamente
create or replace function public.stamp_task_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'hecho' and old.status is distinct from 'hecho' then
    new.completed_at := now();
  elsif new.status <> 'hecho' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_tasks_completion
  before update on public.tasks
  for each row execute function public.stamp_task_completion();

-- ----------------------------------------------------------------------------
-- 9. Bitácora + webhook a n8n
-- ----------------------------------------------------------------------------
create or replace function public.emit_task_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
  v_event  text;
  v_body   jsonb;
begin
  if tg_op = 'INSERT' then
    v_event := 'task.created';
    v_body  := jsonb_build_object('task', to_jsonb(new));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_event := 'task.status_changed';
    v_body  := jsonb_build_object(
      'task',       to_jsonb(new),
      'old_status', old.status,
      'new_status', new.status
    );
  else
    return new;
  end if;

  insert into public.task_events (organization_id, task_id, actor_id, event_type, payload)
  values (new.organization_id, new.id, auth.uid(), v_event, v_body);

  select value into v_url    from public.app_config where key = 'n8n_webhook_url';
  select value into v_secret from public.app_config where key = 'n8n_webhook_secret';

  if v_url is not null then
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'X-CRM-Secret', coalesce(v_secret, '')
                 ),
      body    := jsonb_build_object(
                   'event',    v_event,
                   'actor_id', auth.uid(),
                   'data',     v_body
                 )
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

-- ----------------------------------------------------------------------------
-- 10. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.organizations       enable row level security;
alter table public.memberships         enable row level security;
alter table public.pending_invitations enable row level security;
alter table public.end_clients         enable row level security;
alter table public.projects            enable row level security;
alter table public.tasks               enable row level security;
alter table public.comments            enable row level security;
alter table public.attachments         enable row level security;
alter table public.task_events         enable row level security;
alter table public.notifications       enable row level security;

-- 10.1 profiles
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

-- 10.2 organizations
create policy orgs_admin_all on public.organizations
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy orgs_member_read on public.organizations
  for select to authenticated
  using (id in (select public.my_org_ids()));

-- 10.3 memberships
create policy memberships_admin_all on public.memberships
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy memberships_read_own on public.memberships
  for select to authenticated
  using (profile_id = auth.uid());

-- 10.4 pending_invitations: exclusivo tuyo
create policy invitations_admin_all on public.pending_invitations
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- 10.5 end_clients: el cliente administra los suyos
create policy end_clients_admin_all on public.end_clients
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy end_clients_member_rw on public.end_clients
  for all to authenticated
  using (organization_id in (select public.my_org_ids()))
  with check (organization_id in (select public.my_org_ids()));

-- 10.6 projects
create policy projects_admin_all on public.projects
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy projects_member_rw on public.projects
  for all to authenticated
  using (organization_id in (select public.my_org_ids()))
  with check (organization_id in (select public.my_org_ids()));

-- 10.7 tasks
create policy tasks_admin_all on public.tasks
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Ve el kanban completo de SU organización
create policy tasks_member_read on public.tasks
  for select to authenticated
  using (organization_id in (select public.my_org_ids()));

-- Puede crear tareas, siempre en 'nuevo' y a su nombre
create policy tasks_member_insert on public.tasks
  for insert to authenticated
  with check (
    organization_id in (select public.my_org_ids())
    and created_by = auth.uid()
    and status = 'nuevo'
  );

-- Puede corregir su propia tarea mientras siga sin revisar.
-- El trigger guard_task_update le impide tocar status, orden, proyecto o asignado.
create policy tasks_member_update_own on public.tasks
  for update to authenticated
  using (
    organization_id in (select public.my_org_ids())
    and created_by = auth.uid()
    and status = 'nuevo'
  )
  with check (organization_id in (select public.my_org_ids()));

-- Sin política de DELETE para miembros: solo tú borras.

-- 10.8 comments
create policy comments_admin_all on public.comments
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy comments_member_read on public.comments
  for select to authenticated
  using (organization_id in (select public.my_org_ids()));

create policy comments_member_insert on public.comments
  for insert to authenticated
  with check (
    organization_id in (select public.my_org_ids())
    and author_id = auth.uid()
  );

create policy comments_member_update_own on public.comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- 10.9 attachments
create policy attachments_admin_all on public.attachments
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy attachments_member_read on public.attachments
  for select to authenticated
  using (organization_id in (select public.my_org_ids()));

create policy attachments_member_insert on public.attachments
  for insert to authenticated
  with check (
    organization_id in (select public.my_org_ids())
    and uploaded_by = auth.uid()
  );

-- 10.10 task_events: lectura nada más. La escritura va por trigger.
create policy task_events_admin_read on public.task_events
  for select to authenticated
  using (public.is_platform_admin());

create policy task_events_member_read on public.task_events
  for select to authenticated
  using (organization_id in (select public.my_org_ids()));

-- 10.11 notifications
create policy notifications_own_read on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid() or public.is_platform_admin());

create policy notifications_own_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 11. Storage: bucket privado para adjuntos
--     Convención de ruta: {organization_id}/{task_id}/{archivo}
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

create policy storage_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and (
      public.is_platform_admin()
      or (split_part(name, '/', 1))::uuid in (select public.my_org_ids())
    )
  );

create policy storage_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and (
      public.is_platform_admin()
      or (split_part(name, '/', 1))::uuid in (select public.my_org_ids())
    )
  );

-- ----------------------------------------------------------------------------
-- 12. Realtime (para que el kanban se actualice sin recargar)
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;

commit;

-- ============================================================================
--  DESPUÉS DE CORRER ESTA MIGRACIÓN
-- ============================================================================
--
--  1. Crea tu usuario desde Studio o con signup normal.
--
--  2. Promuévete a administrador (una sola vez, desde SQL):
--
--       update public.profiles
--          set role = 'platform_admin'
--        where email = 'tu-correo@dominio.com';
--
--  3. Ajusta la configuración de n8n:
--
--       update public.app_config
--          set value = 'https://n8n.tu-dominio.tech/webhook/crm-events'
--        where key = 'n8n_webhook_url';
--
--       update public.app_config
--          set value = encode(gen_random_bytes(32), 'hex')
--        where key = 'n8n_webhook_secret';
--
--       select value from public.app_config where key = 'n8n_webhook_secret';
--       -- copia ese valor al nodo Webhook de n8n para validar el header
--
--  4. Alta de un cliente nuevo (desde tu backend, con service_role):
--       a) insert en organizations
--       b) insert en pending_invitations (email + organization_id)
--       c) auth.admin.inviteUserByEmail(email)
--     El trigger arma la membresía sola cuando la persona define su contraseña.
--     En ningún momento generas ni envías una contraseña.
--
-- ============================================================================
