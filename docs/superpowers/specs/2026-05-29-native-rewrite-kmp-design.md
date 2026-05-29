---
title: ChefVault Native Rewrite — KMP shared logic + native SwiftUI & Jetpack Compose
status: approved
stage: design
created: 2026-05-29
authors: [mikael, claude]
supersedes: docs/tech-context.md (Expo/RN stack) for the native track
related:
  - docs/product-spec.md
  - ".firecrawl/FINDINGS.md (local research scratch, gitignored)"
  - ".firecrawl/workflow-result.json (local research scratch, gitignored)"
---

# ChefVault → Native (Kotlin Multiplatform + SwiftUI + Jetpack Compose)

> Rewrite the existing Expo / React Native + Supabase app into **one shared Kotlin
> Multiplatform logic module** consumed by **two fully native UI apps**: SwiftUI on
> iOS (Apple HIG-idiomatic) and Jetpack Compose + Material 3 on Android. Backend
> (Supabase) and DB schema are reused unchanged.

## 1. Goals & non-goals

### Goals
- Native performance and **deep native capability** access on each platform.
- **Intentionally platform-idiomatic UX** — Apple HIG on iOS, Material 3 on Android.
- Write **business logic once** (models, scaling, costing, aggregation, repositories,
  validation, Supabase client, DI) in a shared KMP module; never twice.
- **Feature-faithful** port of the current working app; current stubs (billing,
  i18n) remain stubs.
- Reuse **Supabase backend, schema, RLS, RPCs, and the 50-recipe trigger as-is.**

### Non-goals (this program)
- No backend re-architecture. No schema migration.
- No new product features beyond what exists today (YAGNI).
- No Compose Multiplatform shared UI — UI is native per platform by explicit choice.
- No offline-first in the first pass (it's a roadmap item; the repository layer is
  designed so a SqlDelight cache can drop in later behind existing interfaces).

### Success criteria
- Shared module compiles for `iosSimulatorArm64` + `androidTarget` and its pure
  engines pass golden-value tests mirroring the current TypeScript output.
- iOS app builds for the `iphonesimulator26.5` SDK and (runtime permitting) runs the
  Auth + Recipe Library vertical slice end-to-end against the existing Supabase project.
- Every current Supabase call has a named KMP equivalent (parity inventory in §10).

## 2. Architecture overview

Single Kotlin `shared` logic module + two native application modules. This matches
the **JetBrains 2026 default KMP structure** (and AGP 9.0 *requires* the Android
entry point to live in a module separate from shared code).

```
chefvault/                         # Gradle root (new native project, lives in repo)
├── settings.gradle.kts
├── gradle/libs.versions.toml      # version catalog — single source of versions
├── gradle.properties              # org.gradle.java.home pinned to Temurin 17
├── shared/                        # KMP library (the deliverable written once)
│   ├── build.gradle.kts           # targets: androidTarget, iosArm64, iosSimulatorArm64, iosX64
│   └── src/
│       ├── commonMain/kotlin/com/chefvault/shared/
│       │   ├── model/             # @Serializable models + enums (port of src/types)
│       │   ├── scaling/           # ScalingEngine (port of src/lib/scaling.ts)
│       │   ├── costing/           # CostingEngine (port of src/lib/costing.ts)
│       │   ├── preplist/          # aggregate + station assignment (from recipeStore.ts)
│       │   ├── validation/        # shared validators (password strength, recipe form)
│       │   ├── export/            # JSON export payload builder (port of export.ts)
│       │   ├── data/
│       │   │   ├── SupabaseClientProvider.kt   # createSupabaseClient { install(...) }
│       │   │   ├── repository/    # interfaces: Recipe/Collection/PrepList/Profile/Auth/Storage
│       │   │   └── remote/        # supabase-kt-backed implementations
│       │   └── di/Koin.kt         # initKoin(platformModule) entry point
│       ├── commonTest/kotlin/     # engine golden-value tests, repo tests (runTest)
│       ├── androidMain/kotlin/    # actual: OkHttp Ktor engine, EncryptedSharedPrefs SessionStore, ICU currency
│       └── iosMain/kotlin/        # actual: Darwin Ktor engine, Keychain SessionStore, NSNumberFormatter currency
├── androidApp/                    # native Jetpack Compose + Material 3
└── iosApp/                        # native SwiftUI (Xcode project consuming shared.xcframework via SKIE)
```

The existing `app/`, `src/`, Expo config stay in place during migration; the native
project is additive until parity is reached, then Expo is retired in a final step.

## 3. Shared module

### 3.1 Responsibilities (written once)
- **Models** (`@Serializable` data classes, `val`-only so they bridge to Swift as
  `Sendable` structs): `Recipe`, `Ingredient`, `Step`, `Collection`, `PrepList`,
  `PrepItem`, `UserProfile`, plus enums `UnitType`, `CuisineType`, `PrepItemStatus`,
  `Plan`, `MeasurementSystem`, and DTOs `RecipeFormData`, `AggregatedIngredient`,
  `ScaledIngredient`, `RecipeCostSummary`.
- **ScalingEngine** (pure): proportional scaling; `kitchenRound` (≥100 whole, ≥10
  half, ≥1 quarter, else tenth); `UNIT_META` table; `convertToSystem` (metric↔imperial);
  `promoteMetric` (g→kg, ml→L); `selectBestUnit`; `scaleRecipeIngredients`.
- **CostingEngine** (pure): per-ingredient cost, roll-up, per-serving, partial-cost
  semantics (`costed_count`/`total_count`/`is_complete`), `calculateScaledCost`,
  currency formatting (expect/actual → ICU on Android, `NSNumberFormatter` on iOS).
- **PrepListBuilder** (pure): `aggregateIngredients` (name|unit keyed sum + kitchen
  round + sort) and station assignment (`STATIONS`, `STATION_TAGS`, keyword `STATION_MAP`,
  default `Dry Goods`).
- **Repositories** (interfaces + supabase-kt impls): `suspend` for writes,
  `Flow<List<…>>` for observable reads, in-memory `MutableStateFlow` cache with
  **optimistic-update-and-rollback** (preserving current Zustand behavior).
- **Validation**, **export builder**, **Koin DI**, **SupabaseClientProvider**.

### 3.2 Libraries (pinned in `libs.versions.toml`; verify exact patches at scaffold)
| Library | Purpose |
|---|---|
| `supabase-kt` (BOM, supabase-community) | Auth (email + OAuth), Postgrest CRUD, Storage upload, RPC. Replaces `@supabase/supabase-js`. |
| Ktor client 3.x | HTTP engine for supabase-kt: `ktor-client-darwin` (iOS), `ktor-client-okhttp` (Android). |
| kotlinx-coroutines 1.10.x | suspend + Flow async backbone. |
| kotlinx-serialization-json 1.9.x | Model (de)serialization + JSON export. |
| kotlinx-datetime 0.7.x (`kotlin.time.Instant`) | Timestamps + prep-list dates. |
| Koin 4.x | DI in commonMain; `initKoin()` from Android `Application` and Swift `@main`. |
| SKIE 0.10.x (iOS framework only) | suspend→async/await, Flow→AsyncSequence, sealed→Swift enum. |
| SqlDelight 2.x | **OPTIONAL / roadmap** — offline cache behind repo interfaces; not in first set. |
| kotlin.test + kotlinx-coroutines-test | commonTest for engines + repos. |

### 3.3 iOS interop decision — **SKIE**
Default Kotlin/Native exposes `suspend` as completion handlers (no real cancellation)
and `Flow` is not consumable from Swift. **SKIE** is chosen: it generates Swift
`async throws`, real `AsyncSequence` (`for await`) with bidirectional cancellation,
and maps Kotlin sealed/enum classes to **exhaustive Swift enums** — valuable for our
sealed state (`SessionStatus`, `PrepItemStatus`, `Plan`, `MeasurementSystem`).
Fallback: **KMP-NativeCoroutines** if SKIE ever blocks a Kotlin upgrade (leaner,
faster-tracking, flows/suspend only). Decision is at the framework API surface, so it
is fixed now. Constraint: keep repository signatures flat (`Flow<List<DataClass>>`,
`suspend` returning value types); do not expose Kotlin lambdas across the boundary.

### 3.4 DI — Koin
`initKoin(platformModule)` defined in commonMain. Android `Application.onCreate` calls
it with an Android module (Context, DataStore, EncryptedSharedPrefs `SessionStore`).
Swift `@main` calls a `KoinIOS.start(sessionStore: KeychainSessionStore())` bridge.
The `SupabaseClient` is constructed once inside Koin in commonMain; UIs only ever see
repository interfaces, never Supabase APIs directly.

## 4. iOS app (built first)

- **Pattern:** MVVM with `@MainActor @Observable` view models (modern SwiftUI). Views
  are dumb and render `vm` state. Repositories injected into VMs via initializer (Koin-
  resolved), never service-located in views (keeps VMs unit-testable with fakes).
- **Navigation:** root `switch authState { authenticated → MainTabView; unauthenticated
  → AuthFlowView; loading → SplashView }`. `TabView` (4 tabs, SF Symbols) each with its
  own `NavigationStack` and typed `Hashable` routes via `.navigationDestination(for:)`.
  Create/edit are `.sheet(item:)` with `.interactiveDismissDisabled(vm.hasUnsavedChanges)`
  + `.confirmationDialog` (ports `useUnsavedChangesGuard`). Photo viewer is
  `.fullScreenCover` with a paged `TabView` + pinch/drag.
- **State tiers:** per-screen `@Observable` VM (ephemeral + derived); app-wide
  `SessionStore` + `ToastCenter` via `.environment`; source-of-truth in the shared
  repositories' `Flow` collected in `.task(id:)` (auto-cancel). Scaling/costing are
  pure derived state recomputed on `targetServings`/`unitSystem` change.
- **Shared consumption (SKIE):** `try await repo.addRecipe(form)`;
  `for await list in repo.observeRecipes() { self.recipes = list }`.
- **Native adapters:** `ASWebAuthenticationSession` (OAuth, `chefvault://`), `PhotosUI`
  (pick) + camera, **Keychain** `SessionStore`, `SensoryFeedback` (haptics), background
  `URLSession` upload with progress.
- **Concurrency:** all VMs `@MainActor`; bridged Kotlin DTOs are immutable → `Sendable`,
  satisfying Swift 6 strict concurrency without `@unchecked`.

## 5. Android app (built second)

- **Pattern:** single-Activity, all-Compose, Material 3. Per-screen `ViewModel` exposes
  one immutable `UiState` via `StateFlow` (`stateIn(WhileSubscribed(5_000))`), read with
  `collectAsStateWithLifecycle()`. Strict UDF: state down, events up. Composables
  stateless `(state, onEvent)` and previewable.
- **Navigation:** Navigation-Compose **type-safe routes** (`@Serializable` destinations),
  single `NavHost`, M3 `NavigationBar` with per-tab saved back stacks, predictive back,
  `ModalBottomSheet` pickers, full-screen create/edit destinations with back-guard dialog.
  `WindowSizeClass.Expanded` → `NavigationRail` + `ListDetailPaneScaffold`.
- **Shared consumption:** no bridging (both Kotlin). VMs inject shared repositories via
  `koinViewModel()`, call `suspend` in `viewModelScope`, collect `Flow` and re-expose
  as `StateFlow`. Pure engines callable from `derivedStateOf` for live scale preview.
- **Native:** Custom Tabs OAuth + deep-link intent-filter; `PickVisualMedia` Photo
  Picker; **EncryptedSharedPrefs** session; **DataStore** theme/units/language/auto_backup;
  Coil 3 images; WorkManager resilient upload; `LocalHapticFeedback`.
- **Brand vs Material You:** fixed brand `ColorScheme` takes precedence over
  `dynamicColorScheme` (staff-tool design guidance) — confirmed product decision.

## 6. Design system — brand preserved, expressed natively

Source of truth: `src/constants/theme.ts`. All dp/pt values are 1:1 with the RN scale.
Orange **`#FF7A00`** is constant across platforms and light/dark; only neutrals flip
(cool-gray dark `#121212`/`#1E1E1E`, warm-stone light `#F5F4F2`/`#FFFFFF` — kept
distinct, not naively inverted).

- **Android:** brand → **M3 color roles** for dark+light (primary `#FF7A00`/onPrimary
  `#FFFFFF`; surfaceContainer tiers map background/surface/field/card =
  `#121212`/`#161616`/`#1A1A1A`/`#1E1E1E`; outline `#2D2D2D`). Inter across the full
  type scale (`labelSmall`/`labelLarge` get all-caps + wide tracking — a signature).
  Radius scale → M3 shapes (cards/buttons 12dp). Cards stay **flat with a hairline
  outline** (elevation 0 + `outlineVariant`); only FAB/primary button carry the
  orange-tinted shadow. Spring params re-tuned for Compose's normalized `dampingRatio`.
- **iOS:** colors in an **asset catalog** (Any/Dark) so `Color("Brand/Primary")` resolves
  automatically; in-code `Spacing`/`Radius`/`Motion` enums for non-appearance constants.
  Inter via `Font.custom(…relativeTo:)` for Dynamic Type. Press feedback via a
  `ButtonStyle` `.scaleEffect` + `.interpolatingSpring(stiffness:150, damping:15)`
  (cards/buttons) / `(300, 20)` (controls) — direct map from Reanimated. Hairline
  strokes over shadows except the primary CTA.

## 7. Screen mapping (all 20, idiomatically divergent)

Full table in `.firecrawl/workflow-result.json` (`.screens`). Highlights:

| Screen | iOS (HIG) | Android (M3) |
|---|---|---|
| Recipe Library | `.searchable` + `List(selection:)` EditMode + swipe | M3 `SearchBar` + contextual selection app-bar + `SwipeToDismissBox` |
| Tab bar | system `TabView` (drop custom dot) | `NavigationBar` (native pill) |
| Recipe create/edit | `.sheet` + `.swipeActions` + unit `.sheet` picker | full-screen + `SwipeToDismissBox` + `ModalBottomSheet` |
| Login social | **Sign in with Apple** first, then Google | Google/Facebook `OutlinedButton`s |
| Settings | inset-grouped `Form` | grouped `ListItem`s + `Switch` |
| Prep-list filter | segmented `Picker` | `SingleChoiceSegmentedButtonRow` |
| Servings scale | `Stepper` + segmented unit `Picker` | `FilledIconButton` steppers + segmented buttons |
| Collections | `LazyVGrid` + `NavigationLink` | `LazyVerticalGrid` + M3 `Card` |
| Photo viewer | `.fullScreenCover` paged `TabView` + pinch | full-screen `HorizontalPager` + `graphicsLayer` zoom |
| Prep-list create date | `DatePicker` (.graphical) | M3 `DatePickerDialog` |

## 8. Native capability mapping (the tricky bits)

| Capability | iOS | Android |
|---|---|---|
| OAuth deep link (`chefvault://`) | `ASWebAuthenticationSession` + `CFBundleURLTypes` | Custom Tabs + intent-filter + `Auth.handleDeeplinks` |
| Secure session (today: plaintext AsyncStorage) | **Keychain** `SessionStore` | **EncryptedSharedPrefs** `SessionStore` |
| Image pick + upload w/ progress | `PhotosUI` + background `URLSession` | `PickVisualMedia` + WorkManager |
| Delete account | `repo.deleteAccount()` → `rpc("delete_user_account")` then clear Keychain | same → clear EncryptedSharedPrefs |
| 50-recipe limit | pre-flight count + map `PostgrestRestException` from trigger to "Free plan limit: 50 recipes" | same |
| Haptics | `SensoryFeedback` | `LocalHapticFeedback` |

## 9. Backend / data flow

Supabase project, schema, RLS, the `delete_user_account` SECURITY DEFINER RPC, and the
`check_recipe_limit()` INSERT trigger are **reused unchanged** and remain the source of
truth. supabase-kt config (URL + anon key) is injected per platform (not hardcoded;
mirror current `EXPO_PUBLIC_*` env via build config / xcconfig). The recipe update
strategy (replace ingredients/steps wholesale) and prep-list creation-from-aggregation
port directly into the remote repository implementations.

## 10. Parity inventory (every current Supabase/store call → KMP target)

| Current (TS) | KMP target |
|---|---|
| `authStore.signInWithEmail` | `AuthRepository.signIn(email,password)` |
| `authStore.signUpWithEmail` | `AuthRepository.signUp(...) → {error, needsConfirmation}` |
| `authStore.signInWithProvider` | `AuthRepository.signInWithProvider` + platform browser |
| `authStore.resetPassword/updatePassword` | `AuthRepository.resetPassword/updatePassword` |
| `authStore.deleteAccount` (RPC then signOut) | `AuthRepository.deleteAccount()` (same order) |
| `authStore.initialize` (session restore) | `AuthRepository.restoreSession()` + `observeSession(): Flow` |
| `recipeStore.getFilteredRecipes` | combine(`observeRecipes()`, query, cuisine) |
| `recipeStore.addRecipe` (50-limit) | `RecipeRepository.addRecipe` (pre-flight + trigger-error map) |
| `recipeStore.updateRecipe/deleteRecipe(s)` | `RecipeRepository.update/delete/deleteMany` |
| `recipeStore.add/remove RecipeToCollection` | `CollectionRepository.*` (optimistic + rollback) |
| `recipeStore.createPrepListFromRecipes` | `PrepListRepository.createFromRecipes` (uses PrepListBuilder) |
| `recipeStore.togglePrepItem` | `PrepListRepository.toggleItem` (optimistic) |
| `storage.uploadImage(s)` | `StorageRepository.upload(bucket, bytes)` (path `userId/timestamp.ext`) |
| `export.exportUserData` | `ExportBuilder.build(...)` + native file/share |
| `useTheme` (system/light/dark) | iOS `@AppStorage`/`preferredColorScheme`; Android DataStore + `ChefVaultTheme` |
| `toastStore` | iOS `ToastCenter`; Android `Channel<UiEvent>` + Snackbar |

## 11. Phased plan

| Phase | Deliverable | Verify |
|---|---|---|
| **P0** Toolchain | Temurin 17 ✅, Xcode 26.5 ✅, iOS sim runtime (downloading) | `java -version`; `xcodebuild -version`; `simctl list runtimes` |
| **P1** Spec | This document, committed | reviewed against `supabase.ts/authStore/storage/recipeStore` |
| **P2** Scaffold | Gradle root + `:shared` + `androidApp`/`iosApp` placeholders; version catalog; wrapper | `./gradlew :shared:compileKotlinIosSimulatorArm64` |
| **P3** Shared core | Models + ScalingEngine + CostingEngine + PrepListBuilder + tests | `./gradlew :shared:allTests` green (golden values) |
| **P4** Shared data | Supabase client + Auth/Recipe repos + Koin + SKIE framework | `:shared:linkDebugFrameworkIosSimulatorArm64` produces framework |
| **P5** iOS slice: Auth | SwiftUI login/signup/forgot + Keychain + OAuth + `AuthViewModel` | `xcodebuild build -sdk iphonesimulator26.5`; sim run sign-in |
| **P6** iOS slice: Library | Recipe list + create (limit + image upload) | sim run: create recipe → row + storage object appear |
| **P7+** | iOS remaining screens → iOS complete → Android (shared module reused) | per-screen |

This session targets **P1–P6** (spec + scaffold + shared core + iOS Auth & Library slice).

## 12. Risks & mitigations
- **supabase-kt ≠ supabase-js** parity (auth events, OAuth deeplink, RLS): verify each
  call against the live schema before trusting; keep email/password as always-available.
- **Engine parity drift**: golden-value tests shared as fixtures between TS and Kotlin.
- **Optimistic UX**: keep optimistic emit + rollback in the repository (not the UI).
- **Background upload + token expiry**: refresh session before enqueue; handle 401 retry;
  consider short-lived signed upload URLs if RLS requires.
- **Keychain/EncryptedSharedPrefs as supabase-kt SessionManager**: integration-test
  persistence across cold launch + refresh, or auto-refresh breaks silently.
- **HEIC**: transcode to JPEG/PNG before upload (honest content-type).
- **iOS sim runtime download** (~7 GB): build-for-SDK works without it; running needs it.

## 13. Open decisions (resolved)
- Interop: **SKIE** (not KMP-NativeCoroutines). ✓
- DI: **Koin** (not Hilt — Android-only). ✓
- iOS framework integration: **direct embed / SPM**, **not CocoaPods** (avoids Ruby/pods). ✓
- Android color: **fixed brand scheme** over Material You dynamic. ✓
- ViewModels: **native per platform**, shared exposes use-cases/repos (not shared VMs). ✓
- Build order: **shared → iOS → Android**. ✓
