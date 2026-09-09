-- ============================================================================
--  CRM / Gestor de proyectos — Migración 006: que archivar signifique algo
--
--  1. BUG DE PRODUCTO. El formulario de ajustes deja poner una organización en
--     'archivado', pero ese estado no tenía ninguna consecuencia: ninguna
--     política de RLS lo miraba y ninguna consulta lo filtraba. Archivabas una
--     agencia y su gente seguía entrando al portal y creando tareas.
--
--     Se arregla en my_org_ids() y no consulta por consulta, porque esa
--     función es la que usan casi todas las políticas de la base. Cambiarla
--     aquí propaga el corte de acceso a tareas, comentarios, adjuntos,
--     proyectos y clientes finales de una sola vez, sin poder olvidarse de
--     ninguna.
--
--     'pausado' NO corta el acceso, a propósito: es un alto temporal, no una
--     baja. Solo 'archivado' cierra la puerta. El platform_admin sigue
--     viéndolo todo por is_platform_admin(), que es una rama aparte.
--
--     Se comprobó antes de escribir esto que ninguna tabla tiene FORCE ROW
--     LEVEL SECURITY. Es lo que hace seguro que una función SECURITY DEFINER
--     consulte organizations: se salta el RLS de esa tabla y no entra en
--     recursión con orgs_member_read, que a su vez llama a esta función.
--
--  2. BUG CONFIRMADO. No existía política de DELETE sobre storage.objects, así
--     que nadie podía borrar del bucket. Eso rompía en silencio la limpieza de
--     subir-archivo.tsx: cuando el registro en la tabla attachments falla, el
--     código retira el objeto recién subido para no dejar basura invisible, y
--     esa llamada se estaba rechazando sin avisar. Cada fallo dejaba un
--     archivo huérfano que nadie volvía a ver ni a poder borrar.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Una organización archivada deja de estar entre "mis organizaciones"
-- ----------------------------------------------------------------------------
-- Ojo: create or replace no conserva la cláusula SET, así que search_path = ''
-- se vuelve a declarar. Sin ella se perdería el endurecimiento de la 005 y
-- volvería a ser posible resolver un nombre a un objeto que no era.
-- Con search_path vacío, toda referencia va cualificada.
create or replace function public.my_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
   where m.profile_id = (select auth.uid())
     and o.status <> 'archivado';
$$;

-- Una función recién creada otorga EXECUTE a public por defecto. Con
-- create or replace se conserva el ACL anterior, pero se repite para que el
-- estado final no dependa de ese detalle.
revoke all on function public.my_org_ids() from public;
grant execute on function public.my_org_ids() to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Poder borrar del bucket, con la misma regla que para leer y escribir
-- ----------------------------------------------------------------------------
drop policy if exists storage_attachments_delete on storage.objects;

create policy storage_attachments_delete on storage.objects
  for delete to authenticated
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

commit;
