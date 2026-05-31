-- Idempotency ledger + audit trail for the RevenueCat webhook. Keyed on
-- RevenueCat's event id so duplicate/retried deliveries are no-ops. RLS is on
-- with NO policies, so only service_role (which bypasses RLS) can read/write it;
-- clients have no access. ON DELETE CASCADE keeps account deletion clean.

create table if not exists public.billing_events (
  event_id            text primary key,
  user_id             uuid references auth.users(id) on delete cascade,
  event_type          text,
  store               text,
  new_plan            text,
  event_timestamp_ms  bigint,
  received_at         timestamptz not null default now(),
  payload             jsonb
);

alter table public.billing_events enable row level security;

-- Belt-and-suspenders: ensure clients hold no table privileges (RLS already denies
-- them since there are no policies).
revoke all on public.billing_events from anon, authenticated;

create index if not exists billing_events_user_id_idx on public.billing_events (user_id);
