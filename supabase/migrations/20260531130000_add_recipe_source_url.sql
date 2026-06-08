-- Attribution for imported recipes: the original link a recipe was imported from
-- (TikTok/Instagram/blog). Nullable — only set on imported recipes.
do $$
begin
  if to_regclass('public.recipes') is null then
    raise notice 'Skipping recipe source_url migration because public.recipes does not exist.';
    return;
  end if;

  alter table public.recipes add column if not exists source_url text;
end $$;
