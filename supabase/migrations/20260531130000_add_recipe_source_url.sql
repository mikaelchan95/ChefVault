-- Attribution for imported recipes: the original link a recipe was imported from
-- (TikTok/Instagram/blog). Nullable — only set on imported recipes.
alter table public.recipes add column if not exists source_url text;
