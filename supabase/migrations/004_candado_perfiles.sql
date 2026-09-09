-- ============================================================================
--  CRM / Gestor de proyectos — Migración 004: candado en profiles
--
--  Encontrado al correr las pruebas de aislamiento de la sección 13.
--
--  La política profiles_update_self de la migración 001 deja a cada quien
--  actualizar SU fila:
--
--    using (id = auth.uid() or public.is_platform_admin())
--
--  RLS filtra filas, no columnas, así que "su fila" incluye la columna role.
--  Un usuario de cliente podía hacer
--
--    PATCH /rest/v1/profiles?id=eq.<el suyo>   {"role":"platform_admin"}
--
--  y a partir de ahí is_platform_admin() le devolvía true: acceso a las
--  tareas, los proyectos, las notas privadas y los correos de TODOS los
--  clientes. Es exactamente el escenario que la sección 5 llama el requisito
--  principal del sistema.
--
--  El documento ya resolvió el mismo problema en tasks con guard_task_update.
--  Esto aplica ese patrón a profiles: mismo trigger, mismo errcode 42501.
--
--  Lo que un usuario sí puede seguir cambiando de su perfil: full_name y
--  avatar_url. Lo demás lo escribe el servidor con service_role, que no tiene
--  auth.uid() y por eso pasa el candado sin excepción especial.
-- ============================================================================

begin;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- service_role y trabajos internos no tienen auth.uid()
  if auth.uid() is null or public.is_platform_admin() then
    return new;
  end if;

  if new.id                   is distinct from old.id
  or new.role                 is distinct from old.role
  or new.email                is distinct from old.email
  or new.must_change_password is distinct from old.must_change_password
  or new.password_set_at      is distinct from old.password_set_at
  or new.invited_at           is distinct from old.invited_at then
    raise exception 'Solo el administrador puede cambiar el rol o los datos de acceso de un perfil'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_profile_update() from public, anon, authenticated;

create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

commit;
