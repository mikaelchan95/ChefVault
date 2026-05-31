# ChefVault Pro Subscription — RevenueCat Design

**Date:** 2026-05-31 · **Status:** Design (not yet implemented) · **Author:** Claude (verified against live repo + Supabase project `xoirfmhmajkhcrdrsxen`)

## Decision summary

- **Provider:** RevenueCat (`purchases-kmp`) on top of StoreKit 2 (iOS) + Google Play Billing (Android). Chosen over Stripe because Apple/Google require their own IAP to unlock in-app digital features (verified: Guideline 3.1.1).
- **Pro unlocks:** (1) unlimited recipes (lift the existing 50 cap), (2) unlimited collections & prep lists. Free stays capped on all three. Costing engine + export remain free for everyone.
- **Architecture:** `profiles.plan` stays the durable Pro gate (already read app-wide). A RevenueCat→Supabase webhook flips it. RevenueCat's on-device entitlement is a fast local-unlock overlay for the seconds before the webhook lands.

## Verified facts (primary sources + live DB)

| Claim | Verdict | Note |
|---|---|---|
| iOS/Android require IAP to unlock in-app features; Stripe-to-unlock is rejected (3.1.1) | ✅ confirmed | US external-link window (Epic v. Apple) is real but **contested** — 9th Cir. stayed it May 2026, SCOTUS petition pending. Treat IAP as default; don't bank on a 0% US loophole. It only permits a browser *link* to your own checkout, never an in-app Stripe form. |
| Small Business Program → 15% under $1M (Apple + Google) | ✅ confirmed | Apple measures *proceeds* (net), requires enrollment. Google is an automatic tiered rate. |
| Google Play subscriptions = 15% from day one | ✅ confirmed | Flat, regardless of revenue. |
| RevenueCat free under $2,500 MTR, then 1% of tracked revenue | ✅ confirmed | Negligible for a free→pro indie app. **But webhooks may require RevenueCat's paid Pro plan — verify in dashboard.** |
| `purchases-kmp` is a real production KMP SDK (iOS+Android) | ✅ confirmed | On Maven Central. |
| **Toolchain:** pin `purchases-kmp 2.10.2`, NOT 3.0.0 | ✅ verified | 2.10.2 is built on **Kotlin 2.1.21 — ChefVault's exact version** → zero toolchain bump. 3.0.0 needs Kotlin 2.3.20 + Gradle 9.4.x + SKIE bump (avoid). |
| `check_recipe_limit()` keys off `profiles.plan` | ✅ verified live | `IF user_plan = 'free' OR user_plan IS NULL` → cap 50. Flipping plan to `'pro'` lifts the cap with **no client change**. |
| `collections` / `prep_lists` have cap triggers | ❌ **none exist** | Only `updated_at` triggers. The "cap all three" decision is currently unenforced — must be built. |

## 🚨 MUST FIX FIRST — verified security hole (paywall is bypassable today)

Verified directly against the live DB: the `profiles` UPDATE policy is `USING/WITH CHECK (auth.uid() = id)` with **no column restriction**, and **both `authenticated` and `anon` hold UPDATE on `profiles.plan`**. Any signed-in user can run:

```sql
update profiles set plan = 'pro' where id = auth.uid();  -- succeeds today
```

…and unlock Pro for free. **This must ship before or with the paywall**, or the entire subscription is bypassable client-side. Recommended fix (apply as a migration after review — user-editable columns confirmed: name, title, avatar_url, default_units, language, auto_backup):

```sql
-- 1. Strip blanket UPDATE; re-grant only user-editable columns (excludes plan, email, id, timestamps)
revoke update on public.profiles from anon, authenticated;
grant update (name, title, avatar_url, default_units, language, auto_backup)
  on public.profiles to authenticated;

-- 2. Defense-in-depth trip-wire: only the service role (the webhook) may change plan
create or replace function public.prevent_plan_self_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plan is distinct from old.plan and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'plan can only be changed by the billing webhook';
  end if;
  return new;
end $$;
create trigger guard_profiles_plan before update on public.profiles
  for each row execute function public.prevent_plan_self_change();
```

The webhook uses the service-role key (bypasses RLS + column grants), so it still writes `plan`. Users keep editing their name/avatar/units.

## Architecture / data flow

```
[Paywall: SubscriptionView.swift / Android SubscriptionScreen]
        │ purchase(package)
        ▼
RevenueCat (purchases-kmp in shared)  ──StoreKit 2 / Play Billing──▶ Apple / Google
        │  on success: entitlement "pro" active  ──▶ shared StateFlow<Boolean> (instant local unlock)
        │
        └─ webhook event ──▶ Supabase Edge Function `revenuecat-webhook`
                                  │ service-role key
                                  ▼
                          UPDATE profiles.plan = 'pro' | 'free'
                                  │
                                  ▼
        SupabaseProfileRepository (StateFlow<UserProfile>) ──▶ both UIs gate on plan
                                  │
                          check_recipe_limit() trigger reads plan ──▶ cap auto-lifts
```

Identity binding: call `Purchases.logIn(supabaseUserId)` at sign-in so RevenueCat `app_user_id` == `auth.users.id` == `profiles.id`; `Purchases.logOut()` at sign-out.

## Implementation by layer

### 1. `native/shared` (KMP) — the engine
- `gradle/libs.versions.toml`: add `purchases-kmp = "2.10.2"` + `purchases-core` (and optional `purchases-result`; skip `purchases-either`/Arrow and the `revenuecatui` module).
- `shared/build.gradle.kts`: add `implementation(libs.purchases.core)` to commonMain; add iOS opt-in `sourceSets.matching { it.name.startsWith("ios") }.configureEach { languageSettings.optIn("kotlinx.cinterop.ExperimentalForeignApi") }`. **`isStatic` is already true** (lines 14-18) — do not change.
- **macos host-test risk:** if RevenueCat publishes no `macosArm64` klib, putting `purchases-core` in commonMain breaks `:shared:macosArm64Test` (the fast test path). Mitigation: keep RC code out of the macos source set / don't reference RC types in `commonTest`.
- Inject the RC public key by **widening `SupabaseConfig`** with a nullable `revenueCatKey` (NOT a new expect/actual — the mechanism is identical per platform, only the string differs; expect/actual would force hardcoding, violating the "secrets injected per platform" rule). Each app passes its key like it already passes `SUPABASE_ANON_KEY`.
- New `RevenueCatRepository` (interface in `Repositories.kt`, impl in `remote/`): `entitlement: StateFlow<Boolean>` (concrete `Boolean` so SKIE bridges to Swift `Bool`, not `KotlinBoolean`), `@Throws suspend purchase(...)`, `restore()`, `syncUserId(uid)`, `logOut()`; constant `PRO_ENTITLEMENT = "pro"`.
- In `ChefVaultSDK`: configure Purchases once (guarded by `config.revenueCatKey?.let`), expose the repo, and drive `logIn/logOut` from a collector on `auth.authState` (so neither UI has to remember). Expose a derived `isProEffective = combine(profile, entitlement)` StateFlow so neither UI hand-rolls the OR.
- **`@Throws` is mandatory** on suspend fns (cf. commit 9680ea8 iOS-launch-crash fix).

### 2. iOS (SwiftUI)
- `SubscriptionView.swift` **already exists** as a stub. New `PaywallViewModel` (`@MainActor @Observable`) loads offerings, exposes `isPro/packages/purchasing`, calls purchase/restore; swallow user-cancel like `AuthViewModel.signInWithGoogle`.
- Replace the `upgradeSection` stub with monthly+annual cards + Subscribe + **Restore Purchases** (Apple-mandated). Fix the comparison table: Collections/Prep currently say "Unlimited" for Free — change to the agreed caps.
- Add the App Review compliance footer: Restore button, plain price/auto-renew disclosure (Guideline 3.1.2), Terms of Use (EULA) + Privacy Policy links. **No external-payment / cheaper-web copy** (auto-reject).
- Paywall trigger: extract `Error.isFreePlanLimit` (today duplicated as `contains("limit") || contains("50")` in `RecipeListViewModel.swift:45` + `RecipeForm.swift:251`); present `SubscriptionView` as a sheet on the recipe cap and the new collection/prep caps.
- Inject `REVENUECAT_PUBLIC_SDK_KEY` (`appl_…`) via `Secrets.xcconfig` → `project.yml` info.properties → `AppConfig`. **Run `xcodegen generate`** after adding the new Swift files.

### 3. Android (Compose)
- `SubscriptionScreen.kt` already exists with a "COMING SOON" stub. Replace `UpgradeSection` with package cards + purchase (`rememberCoroutineScope().launch { runCatching { sdk.revenueCat.purchase(pkg) } }`) + Restore. Fix the same comparison-table copy.
- minSdk is **already 26** (≥ RC's 23 — no change). Set `android:launchMode="singleTop"` on `MainActivity` (also keeps the `chefvault://` OAuth re-use clean).
- Inject `revenuecat.androidKey` (`goog_…`) via `local.properties` → `BuildConfig` (mirror `supabase.host`). Document in CLAUDE.md secrets section.
- Cross-tab nav: Subscription lives in the Settings tab's NavHost; cap triggers fire in other tabs. Hoist tab selection out of `MainScaffold` or pass an `onUpgrade` callback. **Fix `CreatePrepListScreen` — it currently swallows errors** (bare `runCatching` then unconditional `onDone()`); a cap error there would be invisible.

### 4. Supabase backend
- **Apply the security fix above first.**
- New triggers `check_collection_limit()` / `check_prep_limit()` mirroring `check_recipe_limit()` exactly, **adding `SET search_path = public`** (the recipe fn omits it). Read `profiles.plan`, block only when `'free'`/`NULL`. Free caps **TBD (proposed 10/10 — product decision)**.
- New `revenuecat-webhook` Edge Function (`verify_jwt = false`): constant-time compare `Authorization` header vs `REVENUECAT_WEBHOOK_SECRET`; dedupe via a new `billing_events` ledger (PK = RC event id, `ON DELETE CASCADE` to profiles); map `app_user_id`→profiles.id; set plan `'pro'` on INITIAL_PURCHASE/RENEWAL/UNCANCELLATION/PRODUCT_CHANGE, `'free'` on EXPIRATION; **CANCELLATION must NOT downgrade immediately** (access lasts until EXPIRATION — prefer reading the entitlement expiration timestamp over per-type rules); UPSERT via service-role client; return 200 for handled events (≤60s).
- Secrets via `supabase secrets set REVENUECAT_WEBHOOK_SECRET=…` (URL + service-role key are auto-injected). Service-role key never ships in the app.
- Emit a sign-in/sign-out signal from `SupabaseAuthRepository` for `Purchases.logIn/logOut`.
- **Note:** no SQL migrations are checked into the repo (schema is remote-only, 6 applied migrations). Decide whether to introduce `supabase/migrations/` + `supabase/functions/` scaffolding. This project is **shared with another app** (admin_users, menu_items, …) — scope all new objects to ChefVault tables only.

### 5. Out-of-code config (ordering matters)
0. Confirm Apple Developer ($99/yr), Google Play ($25), RevenueCat accounts. **Verify whether webhooks need RevenueCat's paid Pro plan.**
1. Lock Product IDs: `chefvault_pro_monthly`, `chefvault_pro_annual` — byte-identical across all three dashboards. Entitlement id = `pro`. (ID mismatch = empty paywall = rejection.)
2. App Store Connect: one subscription **group**, both products in it, prices, localized metadata + paywall screenshot → "Ready to Submit".
3. Generate Apple App-Specific Shared Secret (or In-App Purchase `.p8`) for RevenueCat.
4. Enroll in the **Small Business Program** (15%).
5. Google Play Console: subscriptions + base plans (monthly/annual) matching IDs; create the service-account JSON for RevenueCat.
6. RevenueCat dashboard: project → add both apps (Apple secret, Play JSON) → entitlement `pro` → import products → Offering `default` with `$rc_monthly`/`$rc_annual` packages → copy the two public SDK keys.
7. Wire the webhook URL `https://xoirfmhmajkhcrdrsxen.supabase.co/functions/v1/revenuecat-webhook` + Authorization secret; filter sandbox vs production (sandbox events hitting prod would flip real users to pro).
8. App Review checklist: Restore button, EULA + Privacy links, auto-renew disclosure, IAP-only, functional paywall, submit IAPs with the build.
9. Sandbox test both platforms end-to-end (purchase → RC entitlement → webhook → `profiles.plan` → cap lifts; cancel/expire → reverts).

## Open decisions (block parts of the build)
1. **Free caps for collections & prep lists** (proposed 10/10) — pricing/product call.
2. **Price points** (monthly + annual) and whether to offer a free trial / intro offer.
3. **RevenueCat paid Pro** — confirm webhooks require it (the plan-sync mechanism depends on the webhook).
4. **Migrations in-repo?** Introduce `supabase/migrations/` + `supabase/functions/`, or keep applying remote-only.
5. Apple auth method for RevenueCat: App-Specific Shared Secret vs `.p8` key.
6. Production Terms of Use (EULA) + Privacy Policy URLs.

## Build sequence (each step verifiable)
1. Security fix migration → verify: authenticated `update … set plan='pro'` is rejected; `set name='x'` still works.
2. shared: add dep + `RevenueCatRepository` → verify `:shared:macosArm64Test` still links; iOS framework links.
3. Supabase: collection/prep caps + webhook + `billing_events` → verify caps raise at limit; webhook idempotent + auth-gated; INITIAL_PURCHASE flips plan, EXPIRATION reverts.
4. iOS + Android paywalls + cap triggers → verify sandbox purchase unlocks; comparison copy correct.
5. Dashboards + sandbox e2e on both platforms → then submit.
