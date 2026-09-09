-- ============================================================================
--  CRM / Gestor de proyectos — Migración 003: endurecer funciones
--
--  Motivo: el linter de seguridad de Supabase detectó que varias funciones
--  SECURITY DEFINER de las migraciones 001 y 002 quedaron expuestas en
--  /rest/v1/rpc/ para los roles anon y authenticated.
--
--  La grave es build_task_payload. Recibe un registro public.tasks como
--  argumento y devuelve nombre de la organización, nombre y empresa del
--  cliente final, nombre del proyecto y LA LISTA DE CORREOS de todos los
--  miembros de esa organización. Al ser SECURITY DEFINER se salta el RLS,
--  así que cualquiera —incluso sin sesión— podía armar un registro con el
--  organization_id de otro cliente y leer sus datos. Eso rompe la regla
--  principal de la sección 5 del documento: la información de un cliente
--  jamás toca la de otro.
--
--  Las demás son funciones de trigger. Llamarlas por RPC falla en tiempo de
--  ejecución, pero no tienen por qué estar publicadas.
--
--  Revocar EXECUTE no afecta a los triggers: Postgres solo verifica ese
--  privilegio al CREAR el trigger, no al dispararlo.
--
--  is_platform_admin() y my_org_ids() conservan EXECUTE para authenticated:
--  las políticas de RLS las evalúan con el rol de quien consulta y sin ese
--  permiso todas las consultas del cliente fallarían.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. search_path fijo en las dos funciones que lo traían mutable
--    Sin esto, quien pueda manipular su search_path podría hacer que la
--    función resuelva otro objeto con el mismo nombre.
-- ----------------------------------------------------------------------------
alter function public.set_updated_at()        set search_path = public;
alter function public.stamp_task_completion() set search_path = public;

-- ----------------------------------------------------------------------------
-- 2. Fuera de la API: funciones que nadie debe poder invocar por RPC
-- ----------------------------------------------------------------------------
revoke all on function public.build_task_payload(public.tasks, text, jsonb)
  from public, anon, authenticated;

revoke all on function public.emit_task_event()       from public, anon, authenticated;
revoke all on function public.emit_comment_event()    from public, anon, authenticated;
revoke all on function public.guard_task_update()     from public, anon, authenticated;
revoke all on function public.handle_new_user()       from public, anon, authenticated;
revoke all on function public.seed_task_types()       from public, anon, authenticated;
revoke all on function public.set_updated_at()        from public, anon, authenticated;
revoke all on function public.stamp_task_completion() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Sin sesión no se llama nada
--    Estas tres sí las necesita authenticated; anon no tiene por qué verlas.
-- ----------------------------------------------------------------------------
revoke all on function public.is_platform_admin() from anon;
revoke all on function public.my_org_ids()        from anon;
revoke all on function public.get_llm_settings()  from anon;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.my_org_ids()        to authenticated;
grant execute on function public.get_llm_settings()  to authenticated;

commit;
