# ChefVault — iOS Launch Readiness (Design + Runbook)

**Date:** 2026-06-07
**Scope:** Get the **iOS** app to a public App Store launch. Signups work, purchases work, features 10/10. Android is **parked** for a follow-up (it lacks in-app purchases entirely and has parity gaps).
**Decision (approved):** Approach A — make the app code-complete + verified first (done in this pass), then run the external setup gauntlet via the runbook below.

This doc is both the design record for the work done autonomously on 2026-06-07 and the **step-by-step runbook** for the parts that require your dashboard logins (Apple, RevenueCat, Google, Supabase secrets).

---

## 0. Product decisions (already locked)

- **Plans / pricing:** Monthly **$4.99**, Annual **$29.99** (7-day free trial), **Lifetime $100** (one-time, non-consumable).
- **Product IDs (byte-identical across App Store Connect + RevenueCat):** `chefvault_pro_monthly`, `chefvault_pro_annual`, `chefvault_pro_lifetime`.
- **Entitlement ID:** `pro`.
- **Free-plan caps (server-enforced):** 50 recipes, 10 collections, 10 prep lists. Costing + export stay free.
- **Social sign-in:** Sign in with Apple (iOS native) + Google (web OAuth).

## Key project constants (reference)

| Thing | Value |
|---|---|
| Supabase project ref | `xoirfmhmajkhcrdrsxen` |
| Supabase URL | `https://xoirfmhmajkhcrdrsxen.supabase.co` |
| iOS bundle id | `com.chefvault.app` |
| App group | `group.com.chefvault.app` |
| OAuth redirect (in app) | `chefvault://auth-callback` |
| Supabase auth callback | `https://xoirfmhmajkhcrdrsxen.supabase.co/auth/v1/callback` |
| RevenueCat webhook URL | `https://xoirfmhmajkhcrdrsxen.supabase.co/functions/v1/revenuecat-webhook` |
| Legal — Privacy | `https://chefvault-legal-app.netlify.app/privacy` |
| Legal — Terms | `https://chefvault-legal-app.netlify.app/terms` |
| Legal Netlify site id | `44135a4d-39c4-4cb8-81b0-9da1b22234e3` |

> The generated RevenueCat webhook secret is in **`LAUNCH_SECRETS.local.md`** (gitignored, repo root). Use that exact value in both Supabase and RevenueCat.

---

## 1. Verified current state (evidence, not assumption)

Checked live against the database and by building + running the app on iPhone 17 simulator (Xcode 26.5, JDK 17).

- **Shared engine tests:** `:shared:macosArm64Test` → BUILD SUCCESSFUL (golden tests green).
- **iOS app:** builds for `iphonesimulator`, launches, restores the Keychain session, and loads the full recipe library from Supabase. Auth + data layer work end-to-end.
- **Email signup/login:** works. Live auth config: `email: true`, `disable_signup: false`, `mailer_autoconfirm: false` (email confirmation required).
- **Social sign-in:** code is correct on both platforms, **but the Supabase providers are OFF** — live config shows `apple: false`, `google: false`. This is the real "social sign-up" blocker. Both must be enabled (§6).
- **Pro-plan "showing without paying" — diagnosed, NOT a bug or security hole:**
  - `profiles.plan` default `'free'`; `authenticated` role can only UPDATE `name/title/avatar_url/default_units/language/auto_backup` (NOT `plan`); trigger `guard_profiles_plan` + `prevent_plan_self_change()` reject any non-service-role plan change. Verified live.
  - Account `mikael@thewinery.com.sg` = **free**; 0 pro / 2 profiles total.
  - The "Pro" you saw is a leftover **RevenueCat sandbox/test entitlement** (`RevenueCatService.isPro`), shown by the paywall while the durable server gate is correctly `free`. It never reconciled because no webhook secret is set. A fresh sandbox tester / configured webhook resolves it.
- **Purchases backend:** `revenuecat-webhook` deployed + ACTIVE (fail-closed until secret set). Lockdown + cap triggers + `billing_events` ledger all live.

## 2. Code changes made this pass (surgical)

1. **Post-purchase reconciliation** (`ChefVaultApp.swift`, `RootView`): on `rc.isPro` becoming true, re-read `profiles.plan` a few times (0/2/4/8s) to outlast webhook latency; also refresh on `scenePhase == .active`. Without this, a brand-new Pro buyer stayed blocked by the server caps until a cold relaunch. *(Fixes a real "purchases work" gap.)*
2. **Restore Purchases busy state** (`SubscriptionView.swift`): disables + shows "Restoring…" during restore (prevents double-taps).
3. **Removed duplicate station label** (`PrepListsView.swift`): station header showed the name twice ("Produce" + "PRODUCE" pill); removed the redundant pill (aligns with the de-noise UI taste).
4. **Real legal pages** (`web/legal/`): wrote Privacy Policy + Terms of Use tailored to ChefVault's actual data flows (Supabase account/content, Apple/RevenueCat billing, recipe-import third parties Gemini/Apify/Firecrawl), deployed live to Netlify, and wired the real URLs into `SubscriptionView.swift` (replacing the dead `chefvault.app/privacy` + the generic Apple EULA).
5. **Build setup:** created `native/iosApp/Secrets.xcconfig` (Supabase host + anon key; empty RC key placeholder) and documented `REVENUECAT_PUBLIC_SDK_KEY` in `Secrets.example.xcconfig`.

## 3. Polish review triage (6-area code review)

- **Fixed:** restore busy state; duplicate station label. (Privacy URL fixed via legal deploy.)
- **Confirmed false positives (no change):**
  - `RecipeDetailView:299` "index out of bounds" — `scaleRecipeIngredients` is `ingredients.map { … }` (strictly 1:1), so indexing the original ingredient for cost is correct.
  - "Missing `NSPhotoLibraryUsageDescription`" — app uses SwiftUI `PhotosPicker` only (privacy-preserving, out-of-process); no usage string required. No camera APIs used.
  - "Recipe unavailable has no back button" — `backRow` (with dismiss) renders above the empty state.
- **Documented follow-ups (intentionally not changed — see §7).**

---

## 4. RUNBOOK — Apple / App Store Connect *(you)*

1. **Apple Developer Program** — enroll/confirm an active paid membership ($99/yr). *(Enrollment can take hours–2 days; do this first.)*
2. **App record** — App Store Connect → create app, bundle id `com.chefvault.app`, set name/primary language/category.
3. **Subscriptions:**
   - Create one **Subscription Group** (e.g. "ChefVault Pro").
   - Add auto-renewable subscriptions: `chefvault_pro_monthly` ($4.99/mo) and `chefvault_pro_annual` ($29.99/yr). Add a **7-day free trial** intro offer on the annual (and/or monthly).
   - Create `chefvault_pro_lifetime` as a **Non-Consumable** in-app purchase ($100).
   - Fill in localized display names + review screenshot for each (use a paywall screenshot).
4. **Small Business Program** — enroll (15% rate).
5. **App Privacy** — complete the questionnaire. Set **Privacy Policy URL** = `https://chefvault-legal-app.netlify.app/privacy` (or your custom domain — see §8).

## 5. RUNBOOK — RevenueCat *(you)*

1. Create/confirm a RevenueCat account; add an **iOS app** (bundle `com.chefvault.app`).
2. Copy the **public SDK key** (`appl_…`) → paste into `native/iosApp/Secrets.xcconfig` as `REVENUECAT_PUBLIC_SDK_KEY`, then rebuild.
3. **Apple credential:** add an App-Specific Shared Secret (or in-app-purchase `.p8` key) so RevenueCat can validate receipts.
4. **Entitlement:** create/rename one entitlement to exactly `pro`.
5. **Products:** import `chefvault_pro_monthly`, `chefvault_pro_annual`, `chefvault_pro_lifetime`; attach all three to the `pro` entitlement.
6. **Offering:** create an offering (default), with packages Monthly / Annual / Lifetime → the matching products. *(The paywall reads `offerings.current`.)*
7. **Webhook:** RevenueCat → Integrations → Webhooks →
   - URL: `https://xoirfmhmajkhcrdrsxen.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization header value:** the exact secret from `LAUNCH_SECRETS.local.md` (raw value, **no** "Bearer " prefix).
   - (Optional) restrict to the right environment; sandbox events are fine for testing.

## 6. RUNBOOK — Social sign-in (Supabase Auth) *(you)*

Both providers are currently OFF in Supabase and must be enabled.

**Google (web OAuth — app uses `oAuthUrl` → browser → `chefvault://auth-callback`):**
1. Google Cloud Console → APIs & Services → Credentials → create an **OAuth 2.0 Client (Web application)**.
2. Authorized redirect URI: `https://xoirfmhmajkhcrdrsxen.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → **Google** → enable, paste the Web client ID + secret.
4. Supabase → Authentication → URL Configuration → add `chefvault://auth-callback` to **Redirect URLs** (allow-list).

**Apple (native Sign in with Apple — app uses `signInWithIdToken`):**
1. Apple Developer → Identifiers → create a **Services ID** + a **Sign in with Apple key** (.p8).
2. Supabase → Authentication → Providers → **Apple** → enable; add the iOS **bundle id** `com.chefvault.app` (and the Services ID) to the allowed client IDs, and the team id / key id / .p8 as required.
3. The app already sends a hashed nonce + identity token; no app changes needed.

> Verify after: `GET https://xoirfmhmajkhcrdrsxen.supabase.co/auth/v1/settings` should then show `external.google: true` and `external.apple: true`.

## 7. RUNBOOK — Supabase secrets *(you, ~1 min)*

The webhook is deployed but fail-closed until its secret is set:

```bash
# from repo root, once (CLI must be logged in + linked):
supabase login
supabase link --project-ref xoirfmhmajkhcrdrsxen
supabase secrets set REVENUECAT_WEBHOOK_SECRET=<value from LAUNCH_SECRETS.local.md>
```

Or set it in the Supabase dashboard → Edge Functions → Secrets. (The recipe-import function secrets — `GEMINI_API_KEY`, `RESOLVER_API_KEY`, optional `FIRECRAWL_API_KEY` — are already configured per prior work.)

## 8. RUNBOOK — Sandbox test + submit *(you + verify)*

1. Create a sandbox Apple ID (App Store Connect → Users and Access → Sandbox).
2. On a device/simulator signed into the sandbox account, open the paywall → purchase monthly → confirm:
   - paywall shows Pro instantly (RevenueCat entitlement),
   - within seconds the **server** flips: `select plan from profiles where id = auth.uid()` → `pro`,
   - free caps lift (try adding a 51st recipe).
3. Cancel/expire the sandbox sub → confirm it reverts to `free` after EXPIRATION.
4. Test **Google** and **Apple** sign-in end-to-end (after §6).
5. (Optional) Move legal pages to a custom domain (e.g. `chefvault.app`) — point DNS at the `chefvault-legal-app` Netlify site or redeploy `web/legal/` there, then update the two URLs in `SubscriptionView.swift` + the App Store Connect Privacy URL.
6. Submit for review with: working Privacy/Terms links (done), Restore button (done), auto-renew disclosure (done), accurate screenshots.

---

## 9. Recommended follow-ups (documented, not done — keep surgical)

These are real but were out of scope for a surgical launch pass; prioritize after launch:

- **Data-layer resilience (shared repos):** recipe create/update does delete-then-insert of ingredients/steps with no rollback — a mid-operation failure can orphan a recipe with empty ingredients. Similarly profile `update()` is optimistic without rollback on server failure. Wrap in try/catch with cleanup/rollback. (Files: `SupabaseRecipeRepository.kt`, `SupabaseProfileRepository.kt`, `SupabasePrepListRepository.kt`.)
- **Silent error surfacing:** `PrepListsView` / `CollectionsView` collect `errorMessage` from their VMs but never display it; image upload failures in `PlatingPhotos.swift` are swallowed by `try?`. Add lightweight error banners.
- **Latent robustness:** a Keychain read failure throws uncaught at launch → infinite loading spinner with no recovery (this is how the unsigned test build failed). Production signed builds won't hit it, but a graceful fallback / error state would harden cold launch.
- **Android:** in-app purchases (purchases-kmp or native), voice capture, recipe hero image on detail, prep-list cap error handling, `EncryptedSharedPreferences` session store.
- **PDF export** and **public recipe share links** (spec features, not yet built).

## 10. Verification evidence

- `:shared:macosArm64Test` → BUILD SUCCESSFUL.
- `xcodebuild … -sdk iphonesimulator` (signed) → **BUILD SUCCEEDED** (after all code changes).
- App installs + launches on iPhone 17 sim → Recipes library loads with live data (no regression).
- Legal: `/privacy`, `/terms`, `/privacy.html`, `/terms.html`, `/` all → HTTP 200, correct titles.
- Live DB security posture + account plan verified via SQL (§1).
