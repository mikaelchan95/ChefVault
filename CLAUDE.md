# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ChefVault is a **Kotlin Multiplatform** core (`native/shared`) consumed by two fully native UI apps: **SwiftUI** on iOS (`native/iosApp`) and **Jetpack Compose + Material 3** on Android (`native/androidApp`). Business logic is written once in `shared`; the UIs are intentionally platform-idiomatic. Backend is Supabase, reused unchanged. The previous Expo/React Native app has been retired (see git history before commit `fc24676`).

The authoritative design is `docs/superpowers/specs/2026-05-29-native-rewrite-kmp-design.md` — read it before any non-trivial change.

## Prerequisites & secrets

- **JDK 17** (Temurin) is required for all Gradle work: `JAVA_HOME=$(/usr/libexec/java_home -v 17)`.
- **Android**: SDK at `/opt/homebrew/share/android-commandlinetools`; export `ANDROID_HOME` to it (also recorded in the gitignored `native/local.properties` as `sdk.dir`). `android.useAndroidX=true` is set in `gradle.properties` (supabase-kt pulls AndroidX).
- **iOS**: Xcode 26.5 + an installed iOS simulator runtime (`xcodebuild -downloadPlatform iOS` if missing — the build *links* without it but can't *run*). `xcodegen` generates the Xcode project from `native/iosApp/project.yml`.
- **Supabase config is injected per platform, never hardcoded.** iOS reads `SUPABASE_HOST` + `SUPABASE_ANON_KEY` from `native/iosApp/Secrets.xcconfig` (→ Info.plist; `AppConfig.makeSDK()` prepends `https://`). Android reads `supabase.host` + `supabase.anonKey` from `native/local.properties` → `BuildConfig`. Both files are gitignored.

## Commands

All Gradle commands run from the repo root against `native/` (e.g. `JAVA_HOME=$(/usr/libexec/java_home -v 17) ./native/gradlew -p native <task>`).

- **Shared engine tests (host target — no simulator needed, fast):** `:shared:macosArm64Test`. This is the canonical way to run/iterate the pure-logic tests; `:shared:allTests` includes `iosSimulatorArm64Test` which needs a booted sim runtime.
- **Single test class:** `:shared:macosArm64Test --tests "*ScalingEngineTest"`.
- **Link the iOS framework:** `:shared:linkDebugFrameworkIosSimulatorArm64`.
- **iOS app build:** regenerate then build —
  `cd native/iosApp && xcodegen generate` then
  `xcodebuild -project native/iosApp/ChefVault.xcodeproj -scheme ChefVault -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' build` (set `JAVA_HOME`; the project's prebuild step runs `:shared:embedAndSignAppleFrameworkForXcode`). Run `xcodegen generate` after adding/removing Swift files — the project globs `native/iosApp/ChefVault/`, so new files are auto-included.
- **Android app build:** `ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ... :androidApp:assembleDebug` → APK at `native/androidApp/build/outputs/apk/debug/`.

## Architecture

**`native/shared` is the single source of truth.** Anything that is business or display logic belongs here, not in either UI:
- `model/` — `@Serializable` `val`-only data classes + enums (`Recipe`, `Collection`, `PrepList`, `UserProfile`, etc.) and picker constants (`UNITS`, `CUISINES`).
- Pure engines: `scaling/` (proportional scaling, kitchen rounding, metric↔imperial), `costing/` (per-ingredient roll-up, `formatCurrency`), `preplist/` (`Stations` keyword assignment). These have golden-value tests mirroring the original TS output — keep them green.
- `data/` — `ChefVaultSDK` is the composition root (constructs the supabase-kt client + repositories). Repositories (`Auth/Recipe/Collection/PrepList/Profile/Storage`) expose **observable reads as `StateFlow`** and **writes as `suspend`**, with an in-memory cache using **optimistic-update-and-rollback** for quick mutations. DTOs (`remote/`) are camelCase + `JsonNamingStrategy.SnakeCase`; kept separate from domain models. Session persistence is an `expect/actual` (`SessionStore.kt`): Keychain on iOS; Android currently falls back to supabase-kt's default (plaintext `SharedPreferences` — a known gap, not yet `EncryptedSharedPreferences`).
- `export/ExportBuilder.kt` — pure JSON export builder; takes `exportedAt` as a param (platform supplies the timestamp).

**Supabase schema (reused unchanged):** tables `recipes`/`ingredients`/`steps`, `collections` + `collection_recipes` join table, `prep_lists` (with a `recipe_ids` text[] array column) + `prep_items`, `profiles`. RPC `delete_user_account` (SECURITY DEFINER; call then sign out). Trigger `check_recipe_limit()` enforces the 50-recipe free cap — surface its `PostgrestRestException` as the "Free plan limit" message. Storage buckets `recipe-images` + `avatars`, path convention `userId/<filename>`. Recipe updates **replace ingredients/steps wholesale** (delete then insert).

**iOS (`native/iosApp/ChefVault`):** MVVM with `@MainActor @Observable` view models; views render `vm` state. Repositories' `StateFlow` are consumed as `for await x in repo.flow` inside a VM `observe()` started from `.task`. Root routes on shared `authState` → `MainTabView` (4 tabs); **each tab owns its own `NavigationStack`** and navigates by `String` id (look the model up from the StateFlow). Design tokens in `DesignSystem/` (`CV.primary` = `#FF7A00`, `CVCard`, `CVSectionHeader`, `formatQuantity`); reuse them. Cross-cutting helpers: `Shared/ImageUpload.swift` (`ImageUploader.upload`), `Shared/PlatingPhotos.swift`, `Auth/SocialSignIn.swift` (Sign in with Apple + Google via `ASWebAuthenticationSession`, `chefvault://` callback → `auth.completeOAuth`).

**Android (`native/androidApp`):** single-Activity Compose, **each tab owns its own `NavHost`** (mirrors iOS). Pure Kotlin — calls shared repos directly, no bridging. Collect `StateFlow` via `collectAsStateWithLifecycle()`; suspend calls via `rememberCoroutineScope().launch { runCatching { … } }`. Fixed brand `ColorScheme` (orange `#FF7A00`) takes precedence over Material You dynamic color (intentional). Shared composables in `ui/common/` (`CvCard`, `SectionHeader`, `formatQuantity`, `uploadPickedImage`). OAuth: launch the browser with `auth.oAuthUrl(...)`, catch the `chefvault://` deep link in `MainActivity.onNewIntent` → `auth.completeOAuth`.

## SKIE bridging gotchas (iOS — verified)

The shared framework is bridged to Swift via SKIE. These bite often:
- Kotlin non-null `Int` property → Swift `Int32` (use `Int(...)`); nullable `Int?` → `KotlinInt?` (`.intValue`); pass an `Int?` param as `KotlinInt(int:)`. Same pattern: `KotlinDouble`, `KotlinBoolean`.
- A Kotlin property named `description` is renamed `description_` in Swift (NSObject clash).
- A Kotlin `object` is accessed via `.shared` (e.g. `ExportBuilder.shared.build(...)`). Top-level Kotlin `val`s are class properties on `<File>Kt` (e.g. `ModelsKt.UNITS`, `ModelsKt.CUISINES`); top-level funcs are exposed as unqualified Swift globals (`calculateRecipeCost(...)`).
- Kotlin enums → Swift enums with lowerCamelCase cases (`MeasurementSystem.metric`, `CollectionStatus.active`, `Plan.pro`).
- The Kotlin model `Collection` collides with `Swift.Collection` — qualify as `ChefVaultShared.Collection`.

## Conventions & traps

- **Branches:** `dev` is integration, `main` is production; feature branches PR into `dev`. (They are currently all in sync on the native rewrite.)
- **Adding a screen:** UI-only logic stays in the UI; any formatting/validation/derivation that both platforms need goes in `shared` (keep iOS and Android from drifting — this is the project's main altitude risk).
- **`.gitignore`:** the Expo `/ios/` and `/android/` ignores are anchored to the repo root on purpose — an unanchored `android/` would silently ignore the Kotlin package `com/chefvault/android/`.
