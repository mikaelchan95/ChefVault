-- Lock down profiles.plan so clients cannot self-promote to Pro.
--
-- Before this migration, the "Users can update own profile" RLS policy had no
-- column restriction and both `authenticated` and `anon` held UPDATE on
-- profiles.plan, so any signed-in user could run
--   update profiles set plan = 'pro' where id = auth.uid();
-- and unlock Pro for free. Only the billing webhook (service_role) may write plan.
--
-- The app's ProfileRepository.update() only ever writes these six columns, so
-- re-granting exactly them keeps profile editing working:
--   name, title, avatar_url, default_units, language, auto_backup

-- 1. Strip the blanket table-level UPDATE and re-grant only the user-editable columns.
revoke update on public.profiles from anon, authenticated;
grant update (name, title, avatar_url, default_units, language, auto_backup)
  on public.profiles to authenticated;

-- 2. Defense-in-depth: reject any non-service-role attempt to change plan, even if
--    a future migration accidentally re-grants UPDATE on the column.
create or replace function public.prevent_plan_self_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.plan is distinct from old.plan and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'plan can only be changed by the billing system';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profiles_plan on public.profiles;
create trigger guard_profiles_plan
  before update on public.profiles
  for each row execute function public.prevent_plan_self_change();
