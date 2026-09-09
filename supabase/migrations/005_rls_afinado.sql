-- ============================================================================
--  CRM / Gestor de proyectos — Migración 005: afinar RLS y arreglar storage
--
--  Tres cosas, en orden de gravedad.
--
--  1. BUG CONFIRMADO. Las políticas del bucket hacen
--     (split_part(name,'/',1))::uuid. Si UN SOLO objeto del bucket tiene un
--     primer segmento que no sea un UUID —una carpeta creada desde Studio, un
--     .emptyFolderPlaceholder, un archivo subido fuera de convención— el cast
--     revienta durante la evaluación de la política y el LISTADO DEL BUCKET
--     FALLA PARA TODOS, no solo para esa fila.
--
--     Reproducido: al subir "carpeta-suelta/archivo.txt" con service_role, el
--     listado de un usuario legítimo pasó de devolver sus archivos a
--     "invalid input syntax for type uuid: carpeta-suelta". La descarga por
--     ruta directa seguía funcionando; el listado no.
--
--     Se compara texto contra texto y desaparece la posibilidad de excepción.
--
--  2. RENDIMIENTO. is_platform_admin() y auth.uid() se llaman sin envolver.
--     Postgres las evalúa por fila candidata. Envueltas en (select ...) pasan
--     a InitPlan y se evalúan una vez por consulta.
--
--     Medido en esta base con 20 organizaciones y 4.000 tareas: el tablero
--     tarda 12 ms, así que hoy no duele. Pero el patrón
--     "or public.is_platform_admin()" impide usar índice y obliga a recorrer
--     organizations, projects y end_clients completos en cada consulta. Los
--     benchmarks de Supabase miden hasta 14.000x de diferencia en tablas
--     grandes con este mismo caso. Es barato hacerlo antes de tener volumen.
--
--  3. SEGURIDAD. search_path = public en funciones SECURITY DEFINER permite,
--     si alguien logra crear un objeto en public, que una referencia se
--     resuelva a algo que no era. Con '' toda referencia va cualificada y la
--     ambigüedad desaparece. Las funciones ya cualifican sus nombres, así que
--     el cambio no altera comportamiento.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Storage: fuera el cast que puede reventar
-- ----------------------------------------------------------------------------
drop policy if exists storage_attachments_read  on storage.objects;
drop policy if exists storage_attachments_write on storage.objects;

create policy storage_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and (
      (select public.is_platform_admin())
      or split_part(name, '/', 1) in (
           select m.organization_id::text
           from public.memberships m
           where m.profile_id = (select auth.uid())
         )
    )
  );

create policy storage_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and (
      (select public.is_platform_admin())
      or split_part(name, '/', 1) in (
           select m.organization_id::text
           from public.memberships m
           where m.profile_id = (select auth.uid())
         )
    )
  );

-- ----------------------------------------------------------------------------
-- 2. Envolver las llamadas para que se evalúen una vez por consulta
-- ----------------------------------------------------------------------------

alter policy profiles_select_self on public.profiles
  using (id = (select auth.uid()) or (select public.is_platform_admin()));

alter policy profiles_update_self on public.profiles
  using (id = (select auth.uid()) or (select public.is_platform_admin()))
  with check (id = (select auth.uid()) or (select public.is_platform_admin()));

alter policy orgs_admin_all on public.organizations
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy orgs_member_read on public.organizations
  using (id in (select public.my_org_ids()));

alter policy memberships_admin_all on public.memberships
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy memberships_read_own on public.memberships
  using (profile_id = (select auth.uid()));

alter policy invitations_admin_all on public.pending_invitations
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy end_clients_admin_all on public.end_clients
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy projects_admin_all on public.projects
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy tasks_admin_all on public.tasks
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy tasks_member_insert on public.tasks
  with check (
    organization_id in (select public.my_org_ids())
    and created_by = (select auth.uid())
    and status = 'nuevo'
  );

alter policy tasks_member_update_own on public.tasks
  using (
    organization_id in (select public.my_org_ids())
    and created_by = (select auth.uid())
    and status = 'nuevo'
  )
  with check (organization_id in (select public.my_org_ids()));

alter policy comments_admin_all on public.comments
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy comments_member_insert on public.comments
  with check (
    organization_id in (select public.my_org_ids())
    and author_id = (select auth.uid())
  );

-- El with check original solo miraba author_id, lo que en teoría dejaba mover
-- un comentario propio a otra organización. En la práctica la base lo
-- rechazaba, pero el motivo no se lee en la política: aquí queda explícito.
alter policy comments_member_update_own on public.comments
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and organization_id in (select public.my_org_ids())
  );

alter policy attachments_admin_all on public.attachments
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy attachments_member_insert on public.attachments
  with check (
    organization_id in (select public.my_org_ids())
    and uploaded_by = (select auth.uid())
  );

alter policy task_events_admin_read on public.task_events
  using ((select public.is_platform_admin()));

alter policy notifications_own_read on public.notifications
  using (recipient_id = (select auth.uid()) or (select public.is_platform_admin()));

alter policy notifications_own_update on public.notifications
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

alter policy task_types_admin_all on public.task_types
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy private_notes_admin_only on public.task_private_notes
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy briefs_own on public.daily_briefs
  using (profile_id = (select auth.uid()) and (select public.is_platform_admin()))
  with check (profile_id = (select auth.uid()) and (select public.is_platform_admin()));

alter policy email_log_admin_read on public.email_log
  using ((select public.is_platform_admin()));

-- ----------------------------------------------------------------------------
-- 3. search_path cerrado en las funciones con privilegios del dueño
-- ----------------------------------------------------------------------------
alter function public.is_platform_admin()     set search_path = '';
alter function public.my_org_ids()            set search_path = '';
alter function public.handle_new_user()       set search_path = '';
alter function public.guard_task_update()     set search_path = '';
alter function public.guard_profile_update()  set search_path = '';
alter function public.emit_task_event()       set search_path = '';
alter function public.emit_comment_event()    set search_path = '';
alter function public.seed_task_types()       set search_path = '';
alter function public.get_llm_settings()      set search_path = '';
alter function public.build_task_payload(public.tasks, text, jsonb) set search_path = '';
alter function public.set_updated_at()        set search_path = '';
alter function public.stamp_task_completion() set search_path = '';

commit;
