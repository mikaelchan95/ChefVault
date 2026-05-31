-- Free-plan caps for collections and prep lists (mirrors the existing 50-recipe
-- cap in check_recipe_limit). Free users get 10 of each; Pro is unlimited.
-- Both guard functions read profiles.plan and only block when plan = 'free' (or
-- NULL, fail-safe). They set search_path = '' and fully-qualify references, which
-- the older check_recipe_limit() omits.

create or replace function public.check_collection_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_plan text;
  collection_count integer;
begin
  select plan into user_plan from public.profiles where id = new.user_id;

  if user_plan = 'free' or user_plan is null then
    select count(*) into collection_count from public.collections where user_id = new.user_id;
    if collection_count >= 10 then
      raise exception 'Free plan collection limit reached (10). Upgrade to Pro for unlimited collections.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_collection_limit on public.collections;
create trigger enforce_collection_limit
  before insert on public.collections
  for each row execute function public.check_collection_limit();

create or replace function public.check_prep_list_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_plan text;
  prep_list_count integer;
begin
  select plan into user_plan from public.profiles where id = new.user_id;

  if user_plan = 'free' or user_plan is null then
    select count(*) into prep_list_count from public.prep_lists where user_id = new.user_id;
    if prep_list_count >= 10 then
      raise exception 'Free plan prep list limit reached (10). Upgrade to Pro for unlimited prep lists.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_prep_list_limit on public.prep_lists;
create trigger enforce_prep_list_limit
  before insert on public.prep_lists
  for each row execute function public.check_prep_list_limit();

-- These are trigger-only functions; they don't need to be callable via PostgREST
-- RPC. Revoke the default EXECUTE grant so they aren't exposed to clients. The
-- triggers still fire (trigger execution doesn't depend on EXECUTE privilege).
revoke execute on function public.check_collection_limit() from public, anon, authenticated;
revoke execute on function public.check_prep_list_limit() from public, anon, authenticated;
