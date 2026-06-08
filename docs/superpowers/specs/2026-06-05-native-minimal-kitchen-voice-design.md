---
title: ChefVault Native Minimal Kitchen UI/UX + Voice Recipe Creation
status: approved
stage: design
created: 2026-06-05
authors: [mikael, codex]
supersedes:
  - "iOS Service Line visual direction in native/iosApp/ChefVault/DesignSystem"
related:
  - docs/superpowers/specs/2026-05-29-native-rewrite-kmp-design.md
  - docs/product-spec.md
  - native/iosApp/ChefVault/DesignSystem/ServiceLine.swift
  - native/iosApp/ChefVault/Recipe/RecipeForm.swift
  - native/iosApp/ChefVault/Recipe/ImportRecipeView.swift
---

# ChefVault Native Minimal Kitchen UI/UX + Voice Recipe Creation

## 1. Decision Summary

ChefVault will intentionally move away from the current dark-first, monochrome
"Service Line" visual system toward a lighter, calmer native iOS utility system:
**Native Minimal Kitchen**.

The redesign is approved to cover the full iOS app surface:

- Recipes, recipe detail, recipe form, link import, and voice recipe creation.
- Collections and collection detail.
- Prep lists.
- Settings and auth.
- Shared visual tokens, reusable components, and motion primitives.

Voice recipe creation becomes a new recipe input path. It captures speech, produces
a transcript, parses that transcript into a normal `NewRecipe` draft, and sends the
user into the existing review form. No voice-created recipe is saved automatically.

## 2. Product Goals

- Make the app feel more minimal, polished, and modern.
- Improve usability by making primary actions clearer and reducing hidden affordances.
- Keep ChefVault practical for staff-facing phone use in kitchens.
- Add subtle motion so the app feels responsive without becoming decorative.
- Add voice-based recipe creation as a fast drafting workflow.
- Preserve the KMP architecture: shared business/data contracts in `native/shared`,
  native SwiftUI UI and recording logic in `native/iosApp`.

## 3. Non-goals

- No Android redesign in this implementation pass unless explicitly requested later.
- No replacement of Supabase as the backend.
- No automatic saving from generated voice content.
- No multi-turn recipe assistant in this pass.
- No real-time voice command system across the whole app in this pass.
- No broad schema redesign; backend work is limited to text-to-recipe parsing support.

## 4. Current System Audit

The current iOS app uses the `SL` design system:

- Fonts: Bricolage Grotesque for display, Hanken Grotesk for body, Space Mono for
  quantities and metadata.
- Colors: dark-first graphite surfaces, near-white accent in dark mode, near-black
  accent in light mode, with red and green as the only semantic colors.
- Backgrounds: radial accent glow plus procedural noise.
- Components: custom app bar, custom floating capsule tab bar, FAB, cards, chips,
  icon buttons, form fields, grouped settings rows.
- UX pattern: four root tabs, each with its own `NavigationStack`; create/edit/import
  are sheets; recipe detail is a pushed view and must not wrap itself in a nested
  `NavigationStack`.

Problems this redesign addresses:

- The dark monochrome system feels heavy and static for everyday phone use.
- Display typography and mono metadata are overused.
- Several important actions are icon-only.
- Dense forms make recipe entry harder than necessary.
- Voice creation does not exist; recipe creation is manual or URL-import only.

## 5. Visual System

The new visual system should be implemented as a new layer named `MK`, rather than
continuing to expand `SL`.

### 5.1 Theme

Light mode becomes the default-feeling experience:

- Background: `#F7F8F6`.
- Surface: `#FFFFFF`.
- Surface 2: `#EEF2EF`.
- Elevated: `#FAFBFA`.
- Text: `#17201D`.
- Muted text: `#65706B`.
- Faint text: `#9AA39E`.
- Border: `#DDE4DF`.
- Strong border: `#C8D2CC`.
- Accent: `#2F7D73`, a restrained blue-green for primary actions, active state,
  focus, and voice.
- On accent: `#FFFFFF`.
- Semantic good: `#2F7D54`.
- Semantic danger: `#C4543F`.

Dark mode remains supported:

- Background: `#101412`.
- Surface: `#171D1A`.
- Surface 2: `#202824`.
- Elevated: `#29312D`.
- Text: `#F4F7F3`.
- Muted text: `#A7B0AA`.
- Faint text: `#737D77`.
- Border: white at 10 percent opacity.
- Strong border: white at 16 percent opacity.
- Accent: `#78C7BA`.
- On accent: `#0F1714`.
- Remove radial glow and procedural noise.
- Keep contrast clean and practical.
- Avoid dramatic graphite gradients.

### 5.2 Typography

- Use iOS system typography for most UI.
- Keep `Space Mono` only for quantities, costs, timestamps, and short operational
  metadata.
- Stop using Bricolage Grotesque as the default display face across screens.
- Avoid negative letter spacing in compact UI.
- Section labels should be readable and quiet, not heavily branded.

### 5.3 Components

Core components:

- `MKBackground`: plain adaptive background with no glow/noise.
- `MKCard`: flat surface with 8-12pt radius and hairline border.
- `MKButton`: primary, secondary, quiet, and destructive variants.
- `MKIconButton`: 40-44pt tap target with native-feeling press feedback.
- `MKSearchField`: light field with search icon and clear affordance.
- `MKChip`: filter chip with clear selected state.
- `MKSectionHeader`: small native section heading.
- `MKGroupedRow`: settings and form row primitive.
- `MKPrimaryActionMenu`: create menu for recipe entry paths.

Component migration should avoid nested cards. Repeated items can be cards; page
sections should remain unframed layouts or grouped rows.

### 5.4 Motion

Motion should be subtle and functional:

- Button/card press: small scale or opacity change.
- Tab change: spring movement on active indicator.
- Row insert/remove: light opacity and move transition.
- Checklist completion: checkmark pop plus strikethrough fade.
- Sheet state changes: smooth recording -> parsing -> review transitions.
- Voice recording: pulsing mic and level bars driven by audio metering.

All motion must respect Reduce Motion by degrading to opacity-only or no animation.

## 6. Screen Design

### 6.1 App Shell

Keep the four-tab structure:

- Recipes.
- Collections.
- Prep.
- Settings.

The custom floating capsule tab can remain if simplified, but it should feel more
native and less decorative. Active states should be clear without strong shadows or
glow. The create affordance should be obvious on screens that create content.

### 6.2 Recipes

Recipe library:

- Keep search, cuisine filter chips, and sort.
- Replace icon-only create/import ambiguity with a clear create menu.
- Create menu options:
  - New Recipe.
  - Talk Recipe.
  - Import Link.
- Recipe rows become lighter and more scannable:
  - image or initials tile.
  - title.
  - cuisine/time/servings.
  - optional cost as secondary metadata.
  - updated timestamp only when useful.

Recipe detail:

- Keep pushed view, no nested `NavigationStack`.
- Header should expose back, share, edit/menu clearly.
- Scaling controls become a practical toolbar:
  - servings stepper.
  - metric/imperial segmented toggle.
- Ingredients and method use clean grouped sections with softer dividers.
- Cost analysis stays visible when cost data exists, but with less visual weight.

Recipe form:

- Keep `RecipeFormView` as the single review/edit/save surface.
- Organize into calmer sections: Basics, Timing, Ingredients, Method, Photos.
- Make ingredient rows easier to scan and edit.
- Make add/delete actions clear with accessible labels and stable tap targets.
- URL import and voice import both land in this form as drafts with warnings.

### 6.3 Voice Recipe Creation

Voice is a new input route into recipe creation, not a new recipe type.

User flow:

1. User taps Talk Recipe from the recipe create menu.
2. `VoiceRecipeView` opens as a focused sheet.
3. The sheet asks for speech and microphone permissions if needed.
4. User records the recipe with a large mic button, elapsed time, audio-level bars,
   and live transcript.
5. User can pause, resume, cancel, or finish.
6. On finish, the transcript is sent to a text-to-recipe parser.
7. Parser returns a `NewRecipe` draft plus warnings.
8. Existing `RecipeFormView(sdk:draft:warnings:)` opens for review.
9. User explicitly taps Save to persist.

Recording copy must stay in English and conversational. Example helper text:

> Say the title, servings, ingredients, and steps. You can review everything before saving.

The transcript should be preserved after parse failure so the user can retry without
recording again.

### 6.4 Collections

- Keep grid layout.
- Remove heavy gradient blocks.
- Use simple collection tiles with icon/count/status and clear title hierarchy.
- Detail view keeps Manage Recipes, member list, and edit/delete menu.
- Empty states should be calm and action-oriented.

### 6.5 Prep

- Keep the operational checklist focus.
- Keep progress prominent.
- Filter chips remain easy to tap.
- Checklist rows should have larger tap targets and subtle completion animation.
- Completion should not shift row layout.

### 6.6 Settings and Auth

- Move closer to native grouped forms.
- Keep profile, subscription, preferences, data, and sign-out sections.
- Reduce decorative pro card treatment.
- Login/sign-up should feel clean and trustworthy, with less oversized branding.

## 7. Architecture

### 7.1 iOS Design System

Add new SwiftUI files under `native/iosApp/ChefVault/DesignSystem`, for example:

- `MinimalKitchen.swift`
- `MinimalKitchenComponents.swift`
- `MinimalKitchenForms.swift`
- `MinimalKitchenMotion.swift`

Existing `SL` components can remain during migration. New and migrated screens should
use the new system. After all iOS screens are migrated, unused `SL` pieces can be
removed in a cleanup commit if safe.

### 7.2 Voice iOS Layer

Add files under `native/iosApp/ChefVault/Recipe`:

- `VoiceRecipeView.swift`
- `VoiceRecipeViewModel.swift`
- `SpeechRecipeRecorder.swift`

Responsibilities:

- `VoiceRecipeView`: SwiftUI sheet and recording/parsing/review state presentation.
- `VoiceRecipeViewModel`: permissions, recording state, transcript, parse call,
  errors, and transition to draft.
- `SpeechRecipeRecorder`: small wrapper around native speech/audio APIs to keep
  the view model testable.

iOS APIs:

- Use Speech framework speech authorization.
- Use microphone permission through AVFoundation.
- Use `AVAudioEngine` to capture live audio.
- Use `SFSpeechAudioBufferRecognitionRequest` for live recognition.
- Add `NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription` to
  the generated Info.plist configuration in `project.yml`.

Apple documentation references:

- https://developer.apple.com/documentation/speech/recognizing-speech-in-live-audio
- https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition

### 7.3 Shared Parsing Contract

The shared layer should expose a text-to-draft parser contract so Android can reuse
the same capability later.

Add to shared repository APIs:

- `RecipeRepository.createDraftFromText(text: String): ImportRecipeResult`

The return shape should match the existing URL import flow:

- `recipe: NewRecipe`
- `warnings: List<String>`

The implementation calls a new Supabase Edge Function and maps the response to the
existing model types.

### 7.4 Supabase Edge Function

Add `supabase/functions/parse-recipe-text/index.ts`.

Input:

```json
{
  "text": "Recipe transcript text..."
}
```

Output:

```json
{
  "recipe": {
    "title": "Example",
    "cuisine": null,
    "servings": 4,
    "prep_time": null,
    "cook_time": null,
    "description": null,
    "image_url": null,
    "plating_photos": [],
    "source_url": null,
    "ingredients": [],
    "steps": []
  },
  "warnings": []
}
```

The function should use the same validation and defensive parsing posture as the
existing `import-recipe` function. It must reject empty or very short transcripts
before calling the model. It must require the user's Supabase auth token.

## 8. Error Handling

Voice errors:

- Speech permission denied: show recovery state and guidance to open Settings.
- Microphone permission denied: show recovery state and guidance to open Settings.
- Speech recognition unavailable: offer manual entry and link import.
- Transcript too short: keep user in the sheet and ask them to record more detail.
- Network failure: keep transcript and offer retry.
- Parser failure: keep transcript and offer retry or manual review in notes.
- Model returns partial recipe: open the form with a warning banner.

General UI errors:

- Preserve existing free-plan paywall behavior.
- Keep destructive confirmations.
- Keep pull-to-refresh for list screens.

## 9. Privacy and Trust

- Recording starts only after explicit user action.
- The app should show when it is recording.
- Transcript is sent for parsing only after the user taps Finish.
- The review form makes clear that generated content should be checked.
- Do not retain audio in this pass.
- Do not save generated recipes automatically.

## 10. Testing and Verification

Shared tests:

- `createDraftFromText` maps valid function responses into `NewRecipe`.
- Short transcript errors are surfaced cleanly.
- Malformed function response is surfaced as a parse error.

Backend tests/manual checks:

- Valid transcript returns structured draft.
- Short transcript returns 400.
- Missing auth returns 401.
- Malformed model output returns a safe error or warning, not invalid recipe data.

iOS build checks:

- Run `xcodegen generate` from `native/iosApp`.
- Run the shared framework link/build path required by the iOS app.
- Run `xcodebuild -project native/iosApp/ChefVault.xcodeproj -scheme ChefVault -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' build`.

Simulator/manual checks:

- Auth screens render in light and dark.
- Recipes, detail, form, import, collections, prep, and settings render in light
  and dark.
- Create menu exposes New Recipe, Talk Recipe, and Import Link.
- Manual new recipe still saves.
- URL import still opens review form.
- Voice permission request appears.
- Voice recording updates transcript and recording animation.
- Finish sends transcript to parser and opens review form.
- Error states preserve the transcript.
- Reduce Motion does not leave controls in broken states.

Visual audit:

- Screenshots for Recipes, Recipe Detail, Recipe Form, Voice Recipe, Collections,
  Prep, Settings, Login, and Sign Up.
- Confirm text does not overlap at common iPhone widths.
- Confirm tap targets remain at least 44pt for primary controls.

## 11. Implementation Sequence

1. Add the new design rubric and minimal kitchen design system files.
2. Migrate shared app shell, buttons, fields, cards, chips, and tab bar.
3. Migrate Recipes, Recipe Detail, Import, and Recipe Form.
4. Add create menu with New Recipe, Talk Recipe, Import Link.
5. Add Supabase `parse-recipe-text` function.
6. Add shared repository method for text-to-draft parsing.
7. Add iOS voice recording flow and Info.plist permission strings.
8. Migrate Collections, Prep, Settings, and Auth.
9. Add focused tests and run build checks.
10. Run simulator and visual audit.
11. Open PR into `dev`.

## 12. Risks and Mitigations

- Speech recognition availability varies by device/locale. Mitigation: provide clear
  unavailable and manual-entry fallbacks.
- Model parsing may hallucinate quantities or steps. Mitigation: every result is a
  draft, warnings are shown, and Save remains explicit.
- Full visual migration can create inconsistent in-between states. Mitigation: migrate
  all iOS screens in one branch and verify screenshots before PR.
- Backend parser can drift from URL import behavior. Mitigation: reuse the same DTO
  shape and validation style as `import-recipe`.
- Large SwiftUI files may become harder to maintain. Mitigation: extract focused
  subviews and keep recording logic out of the view.

## 13. Acceptance Criteria

The goal is complete only when:

- The iOS app no longer presents the current heavy Service Line look across active
  screens.
- The app uses the approved Native Minimal Kitchen visual system across auth, tabs,
  recipes, collections, prep, and settings.
- Subtle motion exists for interaction feedback and voice recording, with Reduce
  Motion support.
- Recipe creation has New Recipe, Talk Recipe, and Import Link paths.
- Talk Recipe records speech, produces a transcript, parses it into a `NewRecipe`
  draft, and opens the existing review form.
- Voice-generated content is never saved without explicit user Save.
- Required iOS speech and microphone permission strings are present.
- Shared/backend parser contract is implemented and verified.
- Build/test commands pass or any environmental blockers are documented with command
  output.
- A PR is opened after implementation.
