// RevenueCat -> Supabase webhook.
//
// Flips public.profiles.plan to 'pro'/'free' based on RevenueCat subscription
// events, so the app's existing profiles.plan gate (and check_recipe_limit /
// check_collection_limit / check_prep_list_limit triggers) unlock automatically.
//
// Auth: RevenueCat sends a static `Authorization` header you configure in its
// dashboard (RevenueCat -> Integrations -> Webhooks). We compare it against the
// REVENUECAT_WEBHOOK_SECRET function secret. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically by the platform.
//
// Deploy with JWT verification OFF (RevenueCat does not send a Supabase JWT):
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
// Set the shared secret:
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<a-long-random-string>
//
// Identity: requires the app to call Purchases.logIn(<supabase user id>) so that
// event.app_user_id == auth.users.id == profiles.id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Event types that should GRANT Pro.
const PRO_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
  "NON_RENEWING_PURCHASE",
]);
// Event types that should REVOKE Pro.
const FREE_TYPES = new Set(["EXPIRATION"]);
// CANCELLATION/BILLING_ISSUE intentionally do NOT downgrade: access continues
// until EXPIRATION. Other types (TRANSFER, SUBSCRIBER_ALIAS, TEST, ...) are
// recorded but leave the plan unchanged.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  // Fail closed: never accept requests until the secret is configured.
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }
  if (req.headers.get("Authorization") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    const body = await req.json();
    event = body?.event ?? {};
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const eventId = event["id"] as string | undefined;
  const appUserId = event["app_user_id"] as string | undefined;
  const eventType = (event["type"] as string | undefined) ?? "";
  if (!eventId) return new Response("Missing event id", { status: 400 });

  // Ignore RevenueCat anonymous ids (pre-logIn) and anything that is not a
  // Supabase user uuid. Acknowledge so RevenueCat stops retrying.
  if (!appUserId || !UUID_RE.test(appUserId)) {
    return new Response(JSON.stringify({ ok: true, skipped: "non-user id" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const desiredPlan = PRO_TYPES.has(eventType)
    ? "pro"
    : FREE_TYPES.has(eventType)
    ? "free"
    : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotency: first writer wins. A duplicate delivery hits the PK and is a no-op.
  const eventTs = Number(event["event_timestamp_ms"] ?? 0);
  const { error: insertErr } = await supabase.from("billing_events").insert({
    event_id: eventId,
    user_id: appUserId,
    event_type: eventType,
    store: event["store"] ?? null,
    new_plan: desiredPlan,
    event_timestamp_ms: eventTs || null,
    payload: event,
  });
  if (insertErr) {
    // Unique violation => already processed this event.
    if (insertErr.code === "23505") {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    // Unexpected => 5xx so RevenueCat retries.
    return new Response(`Ledger insert failed: ${insertErr.message}`, {
      status: 500,
    });
  }

  // No plan change for this event type (e.g. CANCELLATION) — recorded, done.
  if (!desiredPlan) {
    return new Response(JSON.stringify({ ok: true, planChanged: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // Out-of-order guard: skip if a newer event for this user was already applied.
  const { data: newer } = await supabase
    .from("billing_events")
    .select("event_timestamp_ms")
    .eq("user_id", appUserId)
    .neq("event_id", eventId)
    .gt("event_timestamp_ms", eventTs)
    .limit(1);
  if (newer && newer.length > 0) {
    return new Response(JSON.stringify({ ok: true, stale: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ plan: desiredPlan })
    .eq("id", appUserId);
  if (updateErr) {
    return new Response(`Profile update failed: ${updateErr.message}`, {
      status: 500,
    });
  }

  return new Response(
    JSON.stringify({ ok: true, plan: desiredPlan, user: appUserId }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});
