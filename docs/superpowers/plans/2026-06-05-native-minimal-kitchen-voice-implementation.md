# Native Minimal Kitchen Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the full ChefVault iOS app into the approved Native Minimal Kitchen system and add voice-based recipe draft creation.

**Architecture:** Add a new `MK` SwiftUI design system, migrate all active iOS screens from `SL` to `MK`, and keep shared recipe data contracts in KMP. Voice recording stays native iOS; transcript-to-recipe parsing goes through a new shared repository method backed by a Supabase Edge Function that returns the existing `ImportedRecipe`/`NewRecipe` draft shape.

**Tech Stack:** SwiftUI, Speech, AVFoundation, Kotlin Multiplatform, supabase-kt Functions, Supabase Edge Functions on Deno, XCTest/XCUITest, xcodegen, xcodebuild.

---

## File Structure

### New files

- `DESIGN_RUBRIC.md` - the visual, motion, and usability rubric used for implementation self-review.
- `docs/superpowers/plans/2026-06-05-native-minimal-kitchen-voice-implementation.md` - this plan.
- `native/iosApp/ChefVault/DesignSystem/MinimalKitchen.swift` - `MK` color, spacing, type, radius, and motion tokens.
- `native/iosApp/ChefVault/DesignSystem/MinimalKitchenComponents.swift` - reusable cards, buttons, icons, chips, app bar, search, empty states, create menu, and tab chrome.
- `native/iosApp/ChefVault/DesignSystem/MinimalKitchenForms.swift` - fields, grouped rows, toggles, section containers, steppers, segmented controls.
- `native/iosApp/ChefVault/DesignSystem/MinimalKitchenMotion.swift` - reduce-motion-aware button styles and transition helpers.
- `native/iosApp/ChefVault/Recipe/VoiceRecipeView.swift` - voice recording sheet and review transition.
- `native/iosApp/ChefVault/Recipe/VoiceRecipeViewModel.swift` - recording state, transcript, parser call, and errors.
- `native/iosApp/ChefVault/Recipe/SpeechRecipeRecorder.swift` - Speech/AVAudioEngine wrapper.
- `native/iosApp/ChefVaultTests/VoiceRecipeViewModelTests.swift` - unit tests for voice view model state transitions using fakes.
- `native/iosApp/ChefVaultUITests/ChefVaultUITests.swift` - app launch, core tab, and screenshot smoke tests.
- `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/remote/ImportedRecipeMapper.kt` - shared import response DTO decoding and mapping.
- `native/shared/src/commonTest/kotlin/com/chefvault/shared/ImportedRecipeMapperTest.kt` - mapper tests for valid and malformed parser responses.
- `supabase/functions/parse-recipe-text/index.ts` - authenticated text transcript to recipe draft Edge Function.
- `supabase/functions/parse-recipe-text/recipe-normalize.ts` - normalizer helpers testable without calling Gemini.
- `supabase/functions/parse-recipe-text/recipe-normalize_test.ts` - Deno tests for transcript validation and normalization.

### Modified files

- `native/iosApp/project.yml` - add Speech permission strings, microphone permission string, and iOS test targets.
- `native/iosApp/ChefVault/App/SLTabScaffold.swift` - convert app shell/tab bar/FAB to `MK`.
- `native/iosApp/ChefVault/ChefVaultApp.swift` - keep root wiring, use `MK.accent` tint.
- `native/iosApp/ChefVault/Auth/LoginView.swift` - migrate auth screen to `MK`.
- `native/iosApp/ChefVault/Auth/SignUpView.swift` - migrate auth screen to `MK`.
- `native/iosApp/ChefVault/Auth/ForgotPasswordView.swift` - migrate auth screen to `MK`.
- `native/iosApp/ChefVault/Auth/SocialSignIn.swift` - migrate buttons to `MK`.
- `native/iosApp/ChefVault/Recipe/RecipeLibraryView.swift` - add create menu, voice sheet, and `MK` list UI.
- `native/iosApp/ChefVault/Recipe/RecipeDetailView.swift` - migrate detail layout and scaling toolbar.
- `native/iosApp/ChefVault/Recipe/RecipeForm.swift` - migrate form sections and draft warning banner copy.
- `native/iosApp/ChefVault/Recipe/ImportRecipeView.swift` - migrate link import and reuse parser review flow.
- `native/iosApp/ChefVault/Collection/CollectionsView.swift` - migrate collection grid.
- `native/iosApp/ChefVault/Collection/CollectionDetailView.swift` - migrate detail and add recipes sheet.
- `native/iosApp/ChefVault/Collection/CreateCollectionView.swift` - migrate collection form.
- `native/iosApp/ChefVault/PrepList/PrepListsView.swift` - migrate checklist and completion motion.
- `native/iosApp/ChefVault/PrepList/CreatePrepListView.swift` - migrate prep list creation.
- `native/iosApp/ChefVault/Settings/*.swift` - migrate settings root and sub-screens.
- `native/iosApp/ChefVault/Shared/PlatingPhotos.swift` - migrate photo surfaces/buttons.
- `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/repository/Repositories.kt` - add `createDraftFromText`.
- `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/remote/SupabaseRecipeRepository.kt` - reuse mapper for URL import and add text parser function call.
- `supabase/config.toml` - add the new function entry if the repo convention requires it.

---

## Task 1: Design Rubric And Test Scaffolding

**Files:**
- Create: `DESIGN_RUBRIC.md`
- Modify: `native/iosApp/project.yml`
- Create: `native/iosApp/ChefVaultUITests/ChefVaultUITests.swift`
- Create: `native/iosApp/ChefVaultTests/VoiceRecipeViewModelTests.swift`

- [ ] **Step 1: Write the design rubric**

Create `DESIGN_RUBRIC.md` with this content:

```markdown
# ChefVault Native Minimal Kitchen Design Rubric

## Brand Tokens

- Light background: #F7F8F6.
- Light surface: #FFFFFF.
- Light secondary surface: #EEF2EF.
- Light text: #17201D.
- Light muted text: #65706B.
- Light borders: #DDE4DF and #C8D2CC.
- Light accent: #2F7D73.
- Dark background: #101412.
- Dark surface: #171D1A.
- Dark secondary surface: #202824.
- Dark text: #F4F7F3.
- Dark accent: #78C7BA.
- Semantic good: #2F7D54.
- Semantic danger: #C4543F.

## Typography

- Use iOS system typography for titles, body, labels, and controls.
- Use Space Mono only for quantities, costs, short dates, and compact operational metadata.
- Do not use Bricolage Grotesque as the app-wide display face.
- Do not use negative letter spacing.

## Layout

- Prefer native, quiet utility layouts.
- Avoid nested cards.
- Use repeated cards only for repeated entities such as recipe rows and collection tiles.
- Keep primary tap targets at least 44 pt.
- Keep staff-facing screens dense but scannable.

## Motion

- Use subtle spring or opacity feedback for taps, row changes, tab selection, and voice recording.
- Respect Reduce Motion.
- Voice recording should show a pulsing mic and level bars.

## Voice Recipe UX

- Talk Recipe creates a draft only.
- Transcript is sent for parsing only when the user taps Finish.
- Generated recipes always land in the review form before saving.
- Permission, short transcript, network, and parser failures preserve user work.

## Screenshot Review

Capture and inspect:

- Login.
- Sign Up.
- Recipes.
- Recipe Detail.
- Recipe Form.
- Voice Recipe.
- Collections.
- Prep.
- Settings.

Pass when the app reads as light, minimal, clear, and native in light mode, with a calm dark mode fallback.
```

- [ ] **Step 2: Add iOS test targets to project.yml**

Modify `native/iosApp/project.yml` by adding permission strings to the existing `ChefVault` target `info.properties`:

```yaml
        NSSpeechRecognitionUsageDescription: ChefVault uses speech recognition to turn your spoken recipe into a draft you can review before saving.
        NSMicrophoneUsageDescription: ChefVault uses the microphone when you choose Talk Recipe to record your recipe instructions.
```

Add these sibling targets after the existing `ShareExtension` target:

```yaml
  ChefVaultTests:
    type: bundle.unit-test
    platform: iOS
    sources:
      - path: ChefVaultTests
    dependencies:
      - target: ChefVault
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.chefvault.app.tests

  ChefVaultUITests:
    type: bundle.ui-testing
    platform: iOS
    sources:
      - path: ChefVaultUITests
    dependencies:
      - target: ChefVault
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.chefvault.app.uitests
```

- [ ] **Step 3: Add the first UI smoke test**

Create `native/iosApp/ChefVaultUITests/ChefVaultUITests.swift`:

```swift
import XCTest

final class ChefVaultUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunchShowsAuthenticationOrMainShell() throws {
        let app = XCUIApplication()
        app.launchArguments.append("UI_TESTING")
        app.launch()

        let loginTitle = app.staticTexts["ChefVault"]
        let recipesTab = app.buttons["Recipes"]
        XCTAssertTrue(
            loginTitle.waitForExistence(timeout: 4) || recipesTab.waitForExistence(timeout: 4),
            "Expected either the auth screen or the main tab shell to appear."
        )
    }

    func testScreenshotsCanBeCaptured() throws {
        let app = XCUIApplication()
        app.launchArguments.append("UI_TESTING")
        app.launch()

        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = "Launch"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
```

- [ ] **Step 4: Add voice view model test with concrete expected API**

Create `native/iosApp/ChefVaultTests/VoiceRecipeViewModelTests.swift` with compile-target API expectations:

```swift
import XCTest
import ChefVaultShared
@testable import ChefVault

@MainActor
final class VoiceRecipeViewModelTests: XCTestCase {
    func testShortTranscriptDoesNotParse() async {
        let parser = FakeVoiceRecipeParser()
        let recorder = FakeSpeechRecipeRecording()
        let vm = VoiceRecipeViewModel(recorder: recorder, parser: parser)

        vm.transcript = "salt"
        await vm.finishRecording()

        XCTAssertEqual(parser.parseCallCount, 0)
        XCTAssertEqual(vm.errorMessage, "Say a little more so ChefVault can build a recipe draft.")
    }

    func testSuccessfulParseProducesDraft() async throws {
        let parser = FakeVoiceRecipeParser()
        parser.result = VoiceRecipeDraft(
            recipe: NewRecipe(
                title: "Tomato Pasta",
                cuisine: nil,
                servings: 4,
                prepTime: nil,
                cookTime: nil,
                description: nil,
                imageUrl: nil,
                platingPhotos: [],
                sourceUrl: nil,
                ingredients: [],
                steps: []
            ),
            warnings: ["Created from voice - please check quantities and steps."]
        )
        let recorder = FakeSpeechRecipeRecording()
        let vm = VoiceRecipeViewModel(recorder: recorder, parser: parser)

        vm.transcript = "Tomato pasta for four with tomatoes, pasta, basil, and olive oil."
        await vm.finishRecording()

        XCTAssertEqual(parser.parseCallCount, 1)
        XCTAssertEqual(vm.draft?.recipe.title, "Tomato Pasta")
        XCTAssertEqual(vm.warnings, ["Created from voice - please check quantities and steps."])
    }
}

private final class FakeSpeechRecipeRecording: SpeechRecipeRecording {
    var authorization: SpeechRecipeAuthorization = .authorized
    var transcript = ""
    var level: Double = 0

    func requestAuthorization() async -> SpeechRecipeAuthorization { authorization }
    func start(onTranscript: @escaping (String) -> Void, onLevel: @escaping (Double) -> Void) throws {
        onTranscript(transcript)
        onLevel(level)
    }
    func stop() {}
}

private final class FakeVoiceRecipeParser: VoiceRecipeParsing {
    var parseCallCount = 0
    var result = VoiceRecipeDraft(
        recipe: NewRecipe(
            title: "Draft",
            cuisine: nil,
            servings: 1,
            prepTime: nil,
            cookTime: nil,
            description: nil,
            imageUrl: nil,
            platingPhotos: [],
            sourceUrl: nil,
            ingredients: [],
            steps: []
        ),
        warnings: []
    )

    func parse(transcript: String) async throws -> VoiceRecipeDraft {
        parseCallCount += 1
        return result
    }
}
```

- [ ] **Step 5: Run xcodegen and verify tests fail for expected missing types**

Run:

```bash
cd native/iosApp
xcodegen generate
xcodebuild -project ChefVault.xcodeproj -scheme ChefVaultTests -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' test
```

Expected: `VoiceRecipeViewModel`, `SpeechRecipeRecording`, `SpeechRecipeAuthorization`, `VoiceRecipeParsing`, and `VoiceRecipeDraft` are not found. This is the intentional TDD failure.

- [ ] **Step 6: Commit the test scaffolding**

```bash
git add DESIGN_RUBRIC.md native/iosApp/project.yml native/iosApp/ChefVaultTests native/iosApp/ChefVaultUITests
git commit -m "test: add redesign rubric and ios smoke tests"
```

---

## Task 2: MK Design System

**Files:**
- Create: `native/iosApp/ChefVault/DesignSystem/MinimalKitchen.swift`
- Create: `native/iosApp/ChefVault/DesignSystem/MinimalKitchenMotion.swift`
- Create: `native/iosApp/ChefVault/DesignSystem/MinimalKitchenComponents.swift`
- Create: `native/iosApp/ChefVault/DesignSystem/MinimalKitchenForms.swift`

- [ ] **Step 1: Create tokens**

Create `native/iosApp/ChefVault/DesignSystem/MinimalKitchen.swift`:

```swift
import SwiftUI

enum MK {
    static let bg = dyn(light: 0xF7F8F6, dark: 0x101412)
    static let surface = dyn(light: 0xFFFFFF, dark: 0x171D1A)
    static let surface2 = dyn(light: 0xEEF2EF, dark: 0x202824)
    static let elevated = dyn(light: 0xFAFBFA, dark: 0x29312D)
    static let text = dyn(light: 0x17201D, dark: 0xF4F7F3)
    static let muted = dyn(light: 0x65706B, dark: 0xA7B0AA)
    static let faint = dyn(light: 0x9AA39E, dark: 0x737D77)
    static let accent = dyn(light: 0x2F7D73, dark: 0x78C7BA)
    static let onAccent = dyn(light: 0xFFFFFF, dark: 0x0F1714)
    static let good = dyn(light: 0x2F7D54, dark: 0x70C08F)
    static let danger = dyn(light: 0xC4543F, dark: 0xE0735F)
    static let line = dynA(light: (0xDDE4DF, 1), dark: (0xFFFFFF, 0.10))
    static let line2 = dynA(light: (0xC8D2CC, 1), dark: (0xFFFFFF, 0.16))
    static let accentSoft = accent.opacity(0.14)

    enum R {
        static let xs: CGFloat = 8
        static let sm: CGFloat = 10
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let pill: CGFloat = 999
    }

    enum Pad {
        static let screen: CGFloat = 18
        static let card: CGFloat = 14
        static let row: CGFloat = 13
    }

    enum Motion {
        static let fast = Animation.easeOut(duration: 0.16)
        static let smooth = Animation.spring(response: 0.32, dampingFraction: 0.84)
        static let gentle = Animation.spring(response: 0.42, dampingFraction: 0.88)
    }

    static func title(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    static func body(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Space Mono", size: size).weight(weight)
    }

    static func dyn(light: UInt, dark: UInt) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) })
    }

    static func dynA(light: (UInt, CGFloat), dark: (UInt, CGFloat)) -> Color {
        Color(uiColor: UIColor {
            $0.userInterfaceStyle == .dark
                ? UIColor(hex: dark.0).withAlphaComponent(dark.1)
                : UIColor(hex: light.0).withAlphaComponent(light.1)
        })
    }
}

struct MKBackground: View {
    var body: some View {
        MK.bg.ignoresSafeArea()
    }
}

struct MKSectionHeader: View {
    let title: String
    var body: some View {
        Text(title)
            .font(MK.body(12, .semibold))
            .foregroundStyle(MK.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
```

- [ ] **Step 2: Create motion helpers**

Create `native/iosApp/ChefVault/DesignSystem/MinimalKitchenMotion.swift`:

```swift
import SwiftUI

struct MKPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.82 : 1)
            .scaleEffect(reduceMotion ? 1 : (configuration.isPressed ? 0.985 : 1))
            .animation(reduceMotion ? .none : MK.Motion.fast, value: configuration.isPressed)
    }
}

struct MKIconPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.75 : 1)
            .scaleEffect(reduceMotion ? 1 : (configuration.isPressed ? 0.94 : 1))
            .animation(reduceMotion ? .none : MK.Motion.fast, value: configuration.isPressed)
    }
}

extension View {
    func mkAnimated<Value: Equatable>(_ value: Value) -> some View {
        modifier(MKAnimationModifier(value: value))
    }
}

private struct MKAnimationModifier<Value: Equatable>: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let value: Value

    func body(content: Content) -> some View {
        content.animation(reduceMotion ? .none : MK.Motion.smooth, value: value)
    }
}
```

- [ ] **Step 3: Create core components**

Create `native/iosApp/ChefVault/DesignSystem/MinimalKitchenComponents.swift` with these public components: `MKCard`, `MKButton`, `MKButtonVariant`, `MKIconButton`, `MKChip`, `MKAppBar`, `MKSearchField`, `MKTile`, `MKEmptyState`, `MKPrimaryAction`, `MKCreateActionMenu`, `MKDivider`, `MKProgressBar`, `MKTabBar`, and `MKFab`.

Use this structure for the first pass:

```swift
import SwiftUI

struct MKCard<Content: View>: View {
    var pad: CGFloat = MK.Pad.card
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(pad)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.md, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: MK.R.md, style: .continuous).strokeBorder(MK.line, lineWidth: 1))
    }
}

enum MKButtonVariant { case primary, secondary, quiet, danger }

struct MKButton: View {
    let title: String
    var variant: MKButtonVariant = .primary
    var icon: String? = nil
    var small = false
    var full = false
    var busy = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if busy {
                    ProgressView().tint(foreground)
                } else {
                    if let icon {
                        Image(systemName: icon).font(.system(size: small ? 13 : 15, weight: .semibold))
                    }
                    Text(title).font(MK.body(small ? 13 : 15, .semibold))
                }
            }
            .frame(maxWidth: full ? .infinity : nil)
            .frame(minHeight: small ? 36 : 44)
            .padding(.horizontal, small ? 13 : 16)
            .foregroundStyle(foreground)
            .background(background, in: RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(border, lineWidth: 1))
        }
        .buttonStyle(MKPressStyle())
        .disabled(busy)
    }

    private var foreground: Color {
        switch variant {
        case .primary: MK.onAccent
        case .secondary: MK.text
        case .quiet: MK.muted
        case .danger: MK.danger
        }
    }

    private var border: Color {
        switch variant {
        case .primary: MK.accent
        case .secondary: MK.line
        case .quiet: .clear
        case .danger: MK.danger.opacity(0.35)
        }
    }

    @ViewBuilder private var background: some View {
        switch variant {
        case .primary: MK.accent
        case .secondary: MK.surface
        case .quiet: Color.clear
        case .danger: MK.danger.opacity(0.12)
        }
    }
}
```

Add the remaining components in the same file using the visual rules from `DESIGN_RUBRIC.md`. `MKTabBar` should accept `@Binding var selection: SLTab` so `SLTabScaffold` can migrate without changing tab routing.

- [ ] **Step 4: Create form components**

Create `native/iosApp/ChefVault/DesignSystem/MinimalKitchenForms.swift` with `MKSubHeader`, `MKTextField`, `MKField`, `MKToggle`, `MKSetGroup`, `MKSetRow`, `MKStepper`, and `MKSegmented`.

`MKTextField` should mirror the `SLTextField` API so migrations are mechanical:

```swift
struct MKTextField: View {
    let placeholder: String
    @Binding var text: String
    var systemImage: String? = nil
    var secure = false
    var keyboard: UIKeyboardType = .default
    @State private var reveal = false

    var body: some View {
        HStack(spacing: 9) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(MK.faint)
                    .frame(width: 18)
            }
            Group {
                if secure && !reveal {
                    SecureField("", text: $text, prompt: Text(placeholder).foregroundColor(MK.faint))
                } else {
                    TextField("", text: $text, prompt: Text(placeholder).foregroundColor(MK.faint))
                }
            }
            .font(MK.body(15))
            .foregroundStyle(MK.text)
            .keyboardType(keyboard)
            .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
            .autocorrectionDisabled(secure || keyboard == .emailAddress)
            if secure {
                Button { reveal.toggle() } label: {
                    Image(systemName: reveal ? "eye.slash" : "eye").foregroundStyle(MK.faint)
                }
                .buttonStyle(MKIconPressStyle())
            }
        }
        .padding(.horizontal, 13)
        .frame(minHeight: 46)
        .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(MK.line2, lineWidth: 1))
    }
}
```

- [ ] **Step 5: Build after adding design system**

Run:

```bash
cd native/iosApp
xcodegen generate
xcodebuild -project ChefVault.xcodeproj -scheme ChefVault -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Expected: build passes, because the new files are not wired into screens yet.

- [ ] **Step 6: Commit design system**

```bash
git add native/iosApp/ChefVault/DesignSystem native/iosApp/project.yml
git commit -m "feat: add minimal kitchen design system"
```

---

## Task 3: Shared Transcript Parser Contract

**Files:**
- Modify: `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/repository/Repositories.kt`
- Create: `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/remote/ImportedRecipeMapper.kt`
- Modify: `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/remote/SupabaseRecipeRepository.kt`
- Create: `native/shared/src/commonTest/kotlin/com/chefvault/shared/ImportedRecipeMapperTest.kt`

- [ ] **Step 1: Write mapper tests first**

Create `native/shared/src/commonTest/kotlin/com/chefvault/shared/ImportedRecipeMapperTest.kt`:

```kotlin
package com.chefvault.shared

import com.chefvault.shared.data.remote.mapImportedRecipeJson
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ImportedRecipeMapperTest {
    @Test
    fun mapsValidParserResponseToDraft() {
        val json = """
            {
              "title": "Tomato Pasta",
              "cuisine": "Italian",
              "servings": 4,
              "prep_time": 10,
              "cook_time": 15,
              "description": "Fast service pasta.",
              "ingredients": [
                { "name": "Pasta", "quantity": 400, "unit": "g", "notes": null },
                { "name": "Tomatoes", "quantity": 500, "unit": "g", "notes": "crushed" }
              ],
              "steps": [
                { "instruction": "Boil pasta.", "timer_seconds": 600 },
                { "instruction": "Toss with tomatoes.", "timer_seconds": null }
              ],
              "warnings": ["Created from voice - please check quantities and steps."]
            }
        """.trimIndent()

        val result = mapImportedRecipeJson(json, fallbackSourceUrl = null)

        assertEquals("Tomato Pasta", result.recipe.title)
        assertEquals("Italian", result.recipe.cuisine)
        assertEquals(4, result.recipe.servings)
        assertEquals(2, result.recipe.ingredients.size)
        assertEquals("crushed", result.recipe.ingredients[1].notes)
        assertEquals(600, result.recipe.steps[0].timerSeconds)
        assertEquals("Created from voice - please check quantities and steps.", result.warnings.single())
    }

    @Test
    fun rejectsBlankDrafts() {
        val json = """{"title":"","ingredients":[],"steps":[],"warnings":[]}"""

        assertFailsWith<IllegalArgumentException> {
            mapImportedRecipeJson(json, fallbackSourceUrl = null)
        }
    }
}
```

- [ ] **Step 2: Run mapper tests and verify they fail**

Run:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./native/gradlew -p native :shared:macosArm64Test --tests "*ImportedRecipeMapperTest"
```

Expected: compile fails because `mapImportedRecipeJson` does not exist.

- [ ] **Step 3: Add repository API**

Modify `RecipeRepository` in `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/repository/Repositories.kt`:

```kotlin
    /** Parses spoken or pasted recipe text into a draft recipe via the
     *  parse-recipe-text edge function. Returns a draft to review — does NOT save. */
    @Throws(Exception::class) suspend fun createDraftFromText(text: String): ImportedRecipe
```

Place it directly after `importFromUrl`.

- [ ] **Step 4: Add mapper implementation**

Create `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/remote/ImportedRecipeMapper.kt`:

```kotlin
package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.ImportedRecipe
import com.chefvault.shared.data.repository.NewIngredient
import com.chefvault.shared.data.repository.NewRecipe
import com.chefvault.shared.data.repository.NewStep
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNamingStrategy

@Serializable
data class ImportErrorDto(
    val error: String? = null,
    val warnings: List<String> = emptyList(),
)

@Serializable
private data class ImportedIngredientDto(
    val name: String,
    val quantity: Double = 1.0,
    val unit: String = "",
    val notes: String? = null,
)

@Serializable
private data class ImportedStepDto(
    val instruction: String,
    val timerSeconds: Int? = null,
)

@Serializable
private data class ImportResponseDto(
    val title: String = "",
    val cuisine: String? = null,
    val servings: Int = 1,
    val prepTime: Int? = null,
    val cookTime: Int? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val sourceUrl: String? = null,
    val ingredients: List<ImportedIngredientDto> = emptyList(),
    val steps: List<ImportedStepDto> = emptyList(),
    val warnings: List<String> = emptyList(),
)

@OptIn(ExperimentalSerializationApi::class)
val importJson: Json = Json {
    namingStrategy = JsonNamingStrategy.SnakeCase
    ignoreUnknownKeys = true
}

fun mapImportedRecipeJson(text: String, fallbackSourceUrl: String?): ImportedRecipe {
    val dto = importJson.decodeFromString<ImportResponseDto>(text)
    val ingredients = dto.ingredients
        .filter { it.name.isNotBlank() }
        .map { NewIngredient(it.name.trim(), it.quantity, it.unit.trim(), it.notes?.trim()) }
    val steps = dto.steps
        .filter { it.instruction.isNotBlank() }
        .map { NewStep(it.instruction.trim(), it.timerSeconds) }
    val title = dto.title.trim().ifEmpty { "Imported recipe" }
    require(ingredients.isNotEmpty() || steps.isNotEmpty()) {
        "Couldn't extract a recipe draft."
    }
    return ImportedRecipe(
        recipe = NewRecipe(
            title = title,
            cuisine = dto.cuisine?.trim()?.ifEmpty { null },
            servings = dto.servings.coerceAtLeast(1),
            prepTime = dto.prepTime,
            cookTime = dto.cookTime,
            description = dto.description?.trim()?.ifEmpty { null },
            imageUrl = dto.imageUrl?.trim()?.ifEmpty { null },
            platingPhotos = listOfNotNull(dto.imageUrl?.trim()?.ifEmpty { null }),
            sourceUrl = dto.sourceUrl?.trim()?.ifEmpty { null } ?: fallbackSourceUrl,
            ingredients = ingredients,
            steps = steps,
        ),
        warnings = dto.warnings,
    )
}
```

- [ ] **Step 5: Refactor SupabaseRecipeRepository to use mapper**

In `native/shared/src/commonMain/kotlin/com/chefvault/shared/data/remote/SupabaseRecipeRepository.kt`:

1. Remove private `ImportErrorDto`, `ImportedIngredientDto`, `ImportedStepDto`, `ImportResponseDto`, and private `importJson`.
2. Keep `ImportRequest`.
3. Add a new request DTO:

```kotlin
@Serializable
private data class TextImportRequest(val text: String)
```

4. Replace the mapping body in `importFromUrl` with:

```kotlin
        return mapImportedRecipeJson(text, fallbackSourceUrl = url)
```

5. Add the new method:

```kotlin
    override suspend fun createDraftFromText(text: String): ImportedRecipe {
        val cleaned = text.trim()
        require(cleaned.length >= 24) { "Say a little more so ChefVault can build a recipe draft." }
        val response = client.functions.invoke("parse-recipe-text") {
            setBody(importJson.encodeToString(TextImportRequest(cleaned)))
            contentType(ContentType.Application.Json)
            timeout {
                requestTimeoutMillis = 90_000
                socketTimeoutMillis = 90_000
            }
        }
        val bodyText = response.body<String>()
        if (!response.status.isSuccess()) {
            val err = runCatching { importJson.decodeFromString<ImportErrorDto>(bodyText) }.getOrNull()
            throw Exception(err?.error ?: "Couldn't create a recipe from that transcript.")
        }
        return mapImportedRecipeJson(bodyText, fallbackSourceUrl = null)
    }
```

- [ ] **Step 6: Run shared tests**

Run:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./native/gradlew -p native :shared:macosArm64Test --tests "*ImportedRecipeMapperTest"
```

Expected: mapper tests pass.

- [ ] **Step 7: Commit shared parser contract**

```bash
git add native/shared/src/commonMain/kotlin/com/chefvault/shared/data/repository/Repositories.kt native/shared/src/commonMain/kotlin/com/chefvault/shared/data/remote native/shared/src/commonTest/kotlin/com/chefvault/shared/ImportedRecipeMapperTest.kt
git commit -m "feat: add recipe text draft parser contract"
```

---

## Task 4: Supabase Parse Recipe Text Function

**Files:**
- Create: `supabase/functions/parse-recipe-text/index.ts`
- Create: `supabase/functions/parse-recipe-text/recipe-normalize.ts`
- Create: `supabase/functions/parse-recipe-text/recipe-normalize_test.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Add normalizer tests first**

Create `supabase/functions/parse-recipe-text/recipe-normalize_test.ts`:

```ts
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertTranscript, normalizeRecipe } from "./recipe-normalize.ts";

Deno.test("assertTranscript rejects short transcript", () => {
  assertThrows(() => assertTranscript("salt"), Error, "Say a little more");
});

Deno.test("normalizeRecipe returns safe draft", () => {
  const out = normalizeRecipe({
    title: "Tomato Pasta",
    servings: "4",
    ingredients: [{ name: "Tomatoes", quantity: "500", unit: "g" }],
    steps: [{ instruction: "Cook the pasta.", timer_seconds: 600.4 }],
    warnings: ["Check salt."],
  });

  assertEquals(out.title, "Tomato Pasta");
  assertEquals(out.servings, 4);
  assertEquals(out.ingredients[0].quantity, 500);
  assertEquals(out.steps[0].timer_seconds, 600);
  assertEquals(out.warnings[0], "Check salt.");
});

Deno.test("normalizeRecipe rejects empty drafts", () => {
  assertThrows(() => normalizeRecipe({ title: "", ingredients: [], steps: [] }), Error, "Couldn't extract");
});
```

- [ ] **Step 2: Run Deno test and verify it fails**

Run:

```bash
deno test supabase/functions/parse-recipe-text/recipe-normalize_test.ts
```

Expected: module not found because `recipe-normalize.ts` does not exist.

- [ ] **Step 3: Add normalizer helper**

Create `supabase/functions/parse-recipe-text/recipe-normalize.ts`:

```ts
export type RecipeDraft = Record<string, unknown>;

export function assertTranscript(text: unknown): string {
  const cleaned = String(text ?? "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 24) {
    throw new Error("Say a little more so ChefVault can build a recipe draft.");
  }
  return cleaned.slice(0, 24000);
}

function asArray(v: unknown): unknown[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeRecipe(recipe: RecipeDraft | null): Record<string, unknown> {
  const r = recipe ?? {};
  const ingredients = asArray(r.ingredients).map((i) => {
    const o = i as Record<string, unknown>;
    return {
      name: String(o.name ?? "").trim(),
      quantity: toNum(o.quantity, 1),
      unit: String(o.unit ?? "").trim(),
      notes: o.notes ? String(o.notes).trim() : null,
    };
  }).filter((i) => i.name.length > 0);

  const steps = asArray(r.steps).map((s) => {
    const o = s as Record<string, unknown>;
    return {
      instruction: String(o.instruction ?? "").trim(),
      timer_seconds: toInt(o.timer_seconds),
    };
  }).filter((s) => s.instruction.length > 0);

  if (ingredients.length === 0 && steps.length === 0) {
    throw new Error("Couldn't extract a recipe draft from that transcript.");
  }

  return {
    title: String(r.title ?? "Voice recipe").trim() || "Voice recipe",
    cuisine: r.cuisine ? String(r.cuisine).trim() : null,
    servings: Math.max(1, toInt(r.servings) ?? 1),
    prep_time: r.prep_time != null ? toInt(r.prep_time) : null,
    cook_time: r.cook_time != null ? toInt(r.cook_time) : null,
    description: r.description ? String(r.description).trim() : null,
    image_url: null,
    source_url: null,
    ingredients,
    steps,
    warnings: [
      "Created from voice - please check quantities and steps.",
      ...asArray(r.warnings).map((w) => String(w)).filter(Boolean),
    ],
  };
}
```

- [ ] **Step 4: Add Edge Function**

Create `supabase/functions/parse-recipe-text/index.ts`:

```ts
import { assertTranscript, normalizeRecipe } from "./recipe-normalize.ts";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_PROMPT =
  "You are a precise recipe drafter for a professional kitchen app. " +
  "From a spoken transcript, extract one recipe. Use only details the speaker gave. " +
  "Give numeric quantities and units where stated. Keep steps short and ordered. " +
  "If a value is missing, omit it and add a short warning. Respond in English.";

const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    cuisine: { type: "string", nullable: true },
    servings: { type: "integer" },
    prep_time: { type: "integer", nullable: true },
    cook_time: { type: "integer", nullable: true },
    description: { type: "string", nullable: true },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          notes: { type: "string", nullable: true },
        },
        required: ["name"],
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          instruction: { type: "string" },
          timer_seconds: { type: "integer", nullable: true },
        },
        required: ["instruction"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["title", "ingredients", "steps"],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Sign in before creating a recipe from voice." }, 401);
  }

  let transcript = "";
  try {
    transcript = assertTranscript((await req.json())?.text);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Provide a recipe transcript." }, 400);
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return json({ error: "GEMINI_API_KEY is not configured." }, 500);

  try {
    const recipe = await geminiExtract(geminiKey, transcript);
    return json(normalizeRecipe(recipe));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function geminiExtract(key: string, transcript: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Create a structured recipe draft from this spoken transcript:\n\n${transcript}`,
          }],
        }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RECIPE_SCHEMA,
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason;
    throw new Error(reason ? `The parser returned no recipe (${reason}).` : "The parser returned no recipe.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Could not parse the generated recipe.");
  }
}
```

- [ ] **Step 5: Add config entry**

Inspect `supabase/config.toml`. If functions are configured explicitly, add:

```toml
[functions.parse-recipe-text]
verify_jwt = true
```

If `config.toml` has no per-function entries for existing functions, leave it unchanged and document that Supabase defaults to JWT verification.

- [ ] **Step 6: Run Deno normalizer tests**

Run:

```bash
deno test supabase/functions/parse-recipe-text/recipe-normalize_test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Commit Edge Function**

```bash
git add supabase/functions/parse-recipe-text supabase/config.toml
git commit -m "feat: add voice transcript recipe parser function"
```

---

## Task 5: Voice Recording Model And Tests

**Files:**
- Create: `native/iosApp/ChefVault/Recipe/SpeechRecipeRecorder.swift`
- Create: `native/iosApp/ChefVault/Recipe/VoiceRecipeViewModel.swift`
- Modify: `native/iosApp/ChefVaultTests/VoiceRecipeViewModelTests.swift`

- [ ] **Step 1: Add speech recorder abstractions**

Create `native/iosApp/ChefVault/Recipe/SpeechRecipeRecorder.swift`:

```swift
import AVFoundation
import Foundation
import Speech

enum SpeechRecipeAuthorization: Equatable {
    case authorized
    case denied
    case restricted
    case microphoneDenied
    case unavailable
}

protocol SpeechRecipeRecording: AnyObject {
    var transcript: String { get }
    var level: Double { get }
    func requestAuthorization() async -> SpeechRecipeAuthorization
    func start(onTranscript: @escaping (String) -> Void, onLevel: @escaping (Double) -> Void) throws
    func stop()
}

final class SpeechRecipeRecorder: NSObject, SpeechRecipeRecording {
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en_US"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private(set) var transcript = ""
    private(set) var level: Double = 0

    func requestAuthorization() async -> SpeechRecipeAuthorization {
        let speech = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
        guard speech == .authorized else {
            switch speech {
            case .denied: return .denied
            case .restricted: return .restricted
            default: return .unavailable
            }
        }

        let micGranted = await AVAudioApplication.requestRecordPermission()
        guard micGranted else { return .microphoneDenied }
        guard recognizer?.isAvailable == true else { return .unavailable }
        return .authorized
    }

    func start(onTranscript: @escaping (String) -> Void, onLevel: @escaping (Double) -> Void) throws {
        stop()
        transcript = ""
        level = 0

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        self.request = request

        let input = audioEngine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            request.append(buffer)
            let power = Self.averagePower(buffer: buffer)
            Task { @MainActor in
                self?.level = power
                onLevel(power)
            }
        }

        audioEngine.prepare()
        try audioEngine.start()

        task = recognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                let text = result.bestTranscription.formattedString
                Task { @MainActor in
                    self.transcript = text
                    onTranscript(text)
                }
            }
            if error != nil || result?.isFinal == true {
                self.stop()
            }
        }
    }

    func stop() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        request = nil
        task?.cancel()
        task = nil
    }

    private static func averagePower(buffer: AVAudioPCMBuffer) -> Double {
        guard let data = buffer.floatChannelData?[0] else { return 0 }
        let count = Int(buffer.frameLength)
        guard count > 0 else { return 0 }
        var sum: Float = 0
        for i in 0..<count { sum += abs(data[i]) }
        return min(1, Double(sum / Float(count)) * 18)
    }
}
```

- [ ] **Step 2: Add voice parser abstractions and view model**

Create `native/iosApp/ChefVault/Recipe/VoiceRecipeViewModel.swift`:

```swift
import Foundation
import ChefVaultShared

struct VoiceRecipeDraft {
    let recipe: NewRecipe
    let warnings: [String]
    var title: String { recipe.title }
}

protocol VoiceRecipeParsing: AnyObject {
    func parse(transcript: String) async throws -> VoiceRecipeDraft
}

@MainActor
@Observable
final class VoiceRecipeViewModel {
    enum State: Equatable {
        case idle
        case requestingPermission
        case recording
        case parsing
        case ready
        case failed
    }

    private let recorder: SpeechRecipeRecording
    private let parser: VoiceRecipeParsing
    var state: State = .idle
    var transcript = ""
    var audioLevel: Double = 0
    var errorMessage: String?
    var draft: VoiceRecipeDraft?
    var warnings: [String] = []

    init(recorder: SpeechRecipeRecording, parser: VoiceRecipeParsing) {
        self.recorder = recorder
        self.parser = parser
    }

    var canFinish: Bool { transcript.trimmedForRecipeVoice.count >= 24 && state == .recording }

    func startRecording() async {
        errorMessage = nil
        state = .requestingPermission
        let auth = await recorder.requestAuthorization()
        guard auth == .authorized else {
            state = .failed
            errorMessage = auth.message
            return
        }
        do {
            try recorder.start { [weak self] text in
                Task { @MainActor in self?.transcript = text }
            } onLevel: { [weak self] level in
                Task { @MainActor in self?.audioLevel = level }
            }
            state = .recording
        } catch {
            state = .failed
            errorMessage = (error as NSError).localizedDescription
        }
    }

    func cancelRecording() {
        recorder.stop()
        state = .idle
        audioLevel = 0
    }

    func finishRecording() async {
        recorder.stop()
        audioLevel = 0
        let cleaned = transcript.trimmedForRecipeVoice
        guard cleaned.count >= 24 else {
            state = .failed
            errorMessage = "Say a little more so ChefVault can build a recipe draft."
            return
        }
        state = .parsing
        do {
            let parsed = try await parser.parse(transcript: cleaned)
            draft = parsed
            warnings = parsed.warnings
            state = .ready
        } catch {
            state = .failed
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

private extension SpeechRecipeAuthorization {
    var message: String {
        switch self {
        case .authorized: return ""
        case .denied: return "Speech recognition is disabled. Enable it in Settings to use Talk Recipe."
        case .restricted: return "Speech recognition is restricted on this device."
        case .microphoneDenied: return "Microphone access is disabled. Enable it in Settings to record a recipe."
        case .unavailable: return "Speech recognition is unavailable right now."
        }
    }
}

private extension String {
    var trimmedForRecipeVoice: String {
        replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
```

- [ ] **Step 3: Update tests to compile with real types**

In `native/iosApp/ChefVaultTests/VoiceRecipeViewModelTests.swift`, keep the tests from Task 1. If `@testable import ChefVault` cannot see the app types because of project generated settings, change it to `import ChefVault`.

- [ ] **Step 4: Run unit tests**

Run:

```bash
cd native/iosApp
xcodegen generate
xcodebuild -project ChefVault.xcodeproj -scheme ChefVaultTests -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' test
```

Expected: voice view model tests pass.

- [ ] **Step 5: Commit voice model**

```bash
git add native/iosApp/ChefVault/Recipe/SpeechRecipeRecorder.swift native/iosApp/ChefVault/Recipe/VoiceRecipeViewModel.swift native/iosApp/ChefVaultTests/VoiceRecipeViewModelTests.swift
git commit -m "feat: add voice recipe recording model"
```

---

## Task 6: Voice Recipe View And Recipe Create Menu

**Files:**
- Create: `native/iosApp/ChefVault/Recipe/VoiceRecipeView.swift`
- Modify: `native/iosApp/ChefVault/Recipe/RecipeLibraryView.swift`

- [ ] **Step 1: Add SDK-backed parser adapter**

In `VoiceRecipeView.swift`, define:

```swift
import SwiftUI
import ChefVaultShared

final class SDKVoiceRecipeParser: VoiceRecipeParsing {
    private let sdk: ChefVaultSDK

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
    }

    func parse(transcript: String) async throws -> VoiceRecipeDraft {
        let result = try await sdk.recipes.createDraftFromText(text: transcript)
        return VoiceRecipeDraft(recipe: result.recipe, warnings: result.warnings)
    }
}
```

- [ ] **Step 2: Add VoiceRecipeView**

Create the sheet view with these states:

```swift
struct VoiceRecipeView: View {
    let sdk: ChefVaultSDK
    @Environment(\.dismiss) private var dismiss
    @State private var vm: VoiceRecipeViewModel
    @State private var parsedDraft: NewRecipe?

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
        _vm = State(initialValue: VoiceRecipeViewModel(
            recorder: SpeechRecipeRecorder(),
            parser: SDKVoiceRecipeParser(sdk: sdk)
        ))
    }

    var body: some View {
        Group {
            if let parsedDraft {
                RecipeFormView(sdk: sdk, draft: parsedDraft, warnings: vm.warnings)
            } else {
                recordingSheet
            }
        }
    }

    private var recordingSheet: some View {
        VStack(spacing: 0) {
            MKSubHeader(title: "Talk Recipe", back: "Close") { dismiss() }
            ScrollView {
                VStack(spacing: 18) {
                    micButton
                    Text("Say the title, servings, ingredients, and steps. You can review everything before saving.")
                        .font(MK.body(13))
                        .foregroundStyle(MK.muted)
                        .multilineTextAlignment(.center)
                    transcriptCard
                    if let errorMessage = vm.errorMessage {
                        Text(errorMessage)
                            .font(MK.body(13))
                            .foregroundStyle(MK.danger)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    controls
                }
                .padding(MK.Pad.screen)
            }
        }
        .background(MKBackground())
        .onChange(of: vm.draft) { _, draft in
            parsedDraft = draft?.recipe
        }
    }
}
```

Add `micButton`, `transcriptCard`, and `controls` subviews in the same file. `micButton` must show `waveform.circle.fill`, pulse while `vm.state == .recording`, and use `vm.audioLevel` to scale three level bars.

- [ ] **Step 3: Add create menu state to RecipeLibraryView**

In `RecipeLibraryView`, replace:

```swift
@State private var showCreate = false
@State private var showImport = false
```

with:

```swift
@State private var presentedCreateAction: MKPrimaryAction?
```

Add sheets:

```swift
.sheet(item: $presentedCreateAction) { action in
    switch action {
    case .newRecipe:
        CreateRecipeView(sdk: sdk)
    case .talkRecipe:
        VoiceRecipeView(sdk: sdk)
    case .importLink:
        ImportRecipeView(sdk: sdk)
    }
}
```

Use `MKCreateActionMenu(selection: $presentedCreateAction)` in the app bar or FAB location.

- [ ] **Step 4: Build**

Run:

```bash
cd native/iosApp
xcodegen generate
xcodebuild -project ChefVault.xcodeproj -scheme ChefVault -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Expected: build passes with the new voice sheet reachable from the create menu.

- [ ] **Step 5: Commit voice UI**

```bash
git add native/iosApp/ChefVault/Recipe/VoiceRecipeView.swift native/iosApp/ChefVault/Recipe/RecipeLibraryView.swift native/iosApp/ChefVault/Recipe/VoiceRecipeViewModel.swift native/iosApp/ChefVaultTests/VoiceRecipeViewModelTests.swift
git commit -m "feat: add talk recipe creation flow"
```

---

## Task 7: Recipes And App Shell MK Migration

**Files:**
- Modify: `native/iosApp/ChefVault/App/SLTabScaffold.swift`
- Modify: `native/iosApp/ChefVault/ChefVaultApp.swift`
- Modify: `native/iosApp/ChefVault/Recipe/RecipeLibraryView.swift`
- Modify: `native/iosApp/ChefVault/Recipe/RecipeDetailView.swift`
- Modify: `native/iosApp/ChefVault/Recipe/RecipeForm.swift`
- Modify: `native/iosApp/ChefVault/Recipe/ImportRecipeView.swift`
- Modify: `native/iosApp/ChefVault/Shared/PlatingPhotos.swift`

- [ ] **Step 1: Migrate root tint**

In `ChefVaultApp.swift`, change:

```swift
.tint(SL.accent)
```

to:

```swift
.tint(MK.accent)
```

- [ ] **Step 2: Migrate tab scaffold**

In `SLTabScaffold.swift`, keep the type names `SLTabScaffold`, `SLTab`, and `SLTabBar` to reduce call-site churn, but change internals to use `MKBackground`, `MKTabBar`, and `MKFab`.

The body should keep:

```swift
ZStack(alignment: .bottom) {
    Group {
        switch tab {
        case .recipes: RecipeLibraryView(sdk: sdk)
        case .collections: CollectionsView(sdk: sdk)
        case .prep: PrepListsView(sdk: sdk)
        case .settings: SettingsView(sdk: sdk, auth: auth)
        }
    }
    MKTabBar(selection: $tab)
}
```

Delete shadow-heavy capsule styling from `SLTabBar` or make `SLTabBar` a thin wrapper around `MKTabBar`.

- [ ] **Step 3: Migrate RecipeLibraryView**

Replace these components:

- `SLAppBar` -> `MKAppBar`.
- `SLIconBtn` -> `MKIconButton`.
- `SLSearchField` -> `MKSearchField`.
- `SLChip` -> `MKChip`.
- `SLRecipeRow` card internals -> `MKCard`, `MKTile`, `MK.body`, `MK.title`, `MK.mono`.
- `SLBackground` -> `MKBackground`.
- `SLFab` -> `MKCreateActionMenu` or `MKFab`.

Keep filtering, sorting, and navigation logic unchanged.

- [ ] **Step 4: Migrate RecipeDetailView**

Use `MKSubHeader`-style top row and `MK` components. Preserve:

- no nested `NavigationStack`.
- `targetServings`.
- metric/imperial segmented binding.
- scaling/cost calculations.
- share and edit/delete behavior.

Change the timer label from emoji to SF Symbol:

```swift
HStack(spacing: 5) {
    Image(systemName: "timer").font(.system(size: 11, weight: .semibold))
    Text(timerLabel(timer)).font(MK.mono(11))
}
```

- [ ] **Step 5: Migrate RecipeForm**

Replace `SL` components with `MK`. Keep `RecipeFormView` initializers unchanged.

Update import warning banner copy:

```swift
MKSectionHeader(title: "Review draft")
Text("Created from import - please check quantities and steps before saving.")
```

For voice warnings, the `warnings` array already contains "Created from voice - please check quantities and steps."

- [ ] **Step 6: Migrate ImportRecipeView and PlatingPhotos**

Use `MKSubHeader`, `MKTextField`, `MKButton`, `MKBackground`, and `MKCard`.

Keep:

- clipboard prefill.
- shared-link auto import.
- parse timeout behavior.
- `RecipeFormView(sdk:draft:warnings:)`.

- [ ] **Step 7: Build and run shared tests**

Run:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./native/gradlew -p native :shared:macosArm64Test
cd native/iosApp
xcodegen generate
xcodebuild -project ChefVault.xcodeproj -scheme ChefVault -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Expected: shared tests pass and iOS app builds.

- [ ] **Step 8: Commit recipe and shell migration**

```bash
git add native/iosApp/ChefVault/App native/iosApp/ChefVault/ChefVaultApp.swift native/iosApp/ChefVault/Recipe native/iosApp/ChefVault/Shared/PlatingPhotos.swift
git commit -m "style: migrate recipe flows to minimal kitchen"
```

---

## Task 8: Collections, Prep, Settings, And Auth MK Migration

**Files:**
- Modify: `native/iosApp/ChefVault/Auth/*.swift`
- Modify: `native/iosApp/ChefVault/Collection/*.swift`
- Modify: `native/iosApp/ChefVault/PrepList/*.swift`
- Modify: `native/iosApp/ChefVault/Settings/*.swift`
- Modify: `native/iosApp/ChefVault/DesignSystem/Components.swift`
- Modify: `native/iosApp/ChefVault/DesignSystem/CVComponents.swift`

- [ ] **Step 1: Migrate auth screens**

Replace `SLBackground`, `SLTextField`, `SLButton`, and `SL` typography with `MK`.

Keep user-facing text English-only. Use:

```swift
Text("ChefVault")
    .font(MK.title(34, .semibold))
    .foregroundStyle(MK.text)
```

Use `MK.accent` only for links and primary actions.

- [ ] **Step 2: Migrate collections**

In `CollectionsView.swift` and `CollectionDetailView.swift`:

- Replace graphite gradients with `MK.surface2` or `MK.accentSoft`.
- Use `MKCard` for collection tiles.
- Use `MKTile` for initials/icons.
- Keep grid, navigation, member toggles, edit/delete, and add recipes behavior.

- [ ] **Step 3: Migrate collection forms**

In `CreateCollectionView.swift` and edit form inside `CollectionDetailView.swift`:

- Use `MKSubHeader`.
- Use `MKTextField`.
- Use `MKChip` or `MKSegmented` for status.
- Use `MKButton` for save.

- [ ] **Step 4: Migrate prep list screens**

In `PrepListsView.swift` and `CreatePrepListView.swift`:

- Replace `SLProgressBar` with `MKProgressBar`.
- Use `MKChip` for filters and list selector.
- Use `MKCard`/plain rows for checklist groups.
- Animate checked changes with reduce-motion-aware `.mkAnimated(item.checked)`.
- Keep station grouping and toggle behavior.

- [ ] **Step 5: Migrate settings root and sub-screens**

For each settings file:

- `AppearanceView.swift`
- `DataBackupView.swift`
- `LanguageView.swift`
- `ProfileView.swift`
- `SecurityView.swift`
- `SettingsView.swift`
- `SubscriptionView.swift`
- `UnitsView.swift`

Replace `SLSetGroup`, `SLSetRow`, `SLSubHeader`, `SLButton`, and `SLTextField` with `MK` equivalents. Keep profile updates, appearance storage, RevenueCat behavior, export, password update, delete account, and unit/language profile updates unchanged.

- [ ] **Step 6: Remove active use of SL in iOS screens**

Run:

```bash
rg -n 'SL[A-Za-z]|SL\\.' native/iosApp/ChefVault
```

Expected after migration: hits may remain in old design-system files and comments, but not in active screen files under `Auth`, `Recipe`, `Collection`, `PrepList`, `Settings`, `App`, or `Shared`.

- [ ] **Step 7: Build**

Run:

```bash
cd native/iosApp
xcodegen generate
xcodebuild -project ChefVault.xcodeproj -scheme ChefVault -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Expected: iOS app builds.

- [ ] **Step 8: Commit remaining screen migration**

```bash
git add native/iosApp/ChefVault/Auth native/iosApp/ChefVault/Collection native/iosApp/ChefVault/PrepList native/iosApp/ChefVault/Settings native/iosApp/ChefVault/DesignSystem
git commit -m "style: migrate app screens to minimal kitchen"
```

---

## Task 9: Full Verification, Screenshots, And PR

**Files:**
- Modify: PR body only, no source file changes expected unless verification finds bugs.

- [ ] **Step 1: Run shared tests**

Run:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./native/gradlew -p native :shared:macosArm64Test
```

Expected: all shared tests pass.

- [ ] **Step 2: Run Deno tests**

Run:

```bash
deno test supabase/functions/parse-recipe-text/recipe-normalize_test.ts
```

Expected: all function helper tests pass.

- [ ] **Step 3: Run iOS unit/UI tests**

Run:

```bash
cd native/iosApp
xcodegen generate
xcodebuild -project ChefVault.xcodeproj -scheme ChefVaultTests -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' test
xcodebuild -project ChefVault.xcodeproj -scheme ChefVaultUITests -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' test
```

Expected: tests pass. If no iPhone 17 runtime is installed, rerun with an installed simulator from `xcrun simctl list devices available` and record the exact simulator used.

- [ ] **Step 4: Run iOS app build**

Run:

```bash
cd native/iosApp
xcodebuild -project ChefVault.xcodeproj -scheme ChefVault -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Expected: build passes.

- [ ] **Step 5: Simulator visual audit**

Use XcodeBuildMCP simulator tools if available. Required flow:

1. Call `session_show_defaults`.
2. If project, scheme, and simulator are configured, call `build_run_sim`.
3. Capture screenshots for Login or Recipes depending on auth state.
4. Navigate through Recipes, Detail, Create menu, Voice Recipe, Collections, Prep, Settings.
5. Capture light and dark appearance screenshots when possible.

Pass criteria:

- The UI matches `DESIGN_RUBRIC.md`.
- No active screen presents the old heavy Service Line look.
- Text does not overlap on common iPhone widths.
- Create menu exposes New Recipe, Talk Recipe, Import Link.
- Talk Recipe permission and error states are reachable.

- [ ] **Step 6: Open PR**

Run:

```bash
git status --short
git log --oneline -8
gh pr create --base dev --head $(git branch --show-current) --title "Redesign iOS app and add voice recipe creation" --body-file /tmp/chefvault-native-minimal-kitchen-pr.md
```

Write `/tmp/chefvault-native-minimal-kitchen-pr.md` with:

```markdown
## Summary

- Replaces the iOS Service Line visual direction with the Native Minimal Kitchen system.
- Migrates active iOS app screens to lighter, more minimal MK components.
- Adds Talk Recipe voice recording, transcript parsing, and review-before-save recipe drafts.
- Adds shared and Supabase parser contracts for transcript-to-recipe draft creation.

## Verification

- [ ] Shared tests: `:shared:macosArm64Test`
- [ ] Deno tests: `parse-recipe-text`
- [ ] iOS unit tests
- [ ] iOS UI tests
- [ ] iOS simulator build
- [ ] Visual audit against `DESIGN_RUBRIC.md`

## Screenshots

Attach screenshots for Recipes, Recipe Detail, Recipe Form, Voice Recipe, Collections, Prep, Settings, and Auth.
```

Expected: PR URL is returned.

---

## Self-Review Checklist

- Spec coverage:
  - Visual system: Tasks 1, 2, 7, 8, 9.
  - Full iOS app migration: Tasks 7 and 8.
  - Motion and Reduce Motion: Tasks 1, 2, 7, 8, 9.
  - Voice recording: Tasks 5 and 6.
  - Shared parser contract: Task 3.
  - Supabase parser: Task 4.
  - Tests and verification: Tasks 1, 3, 4, 5, 9.
  - PR: Task 9.
- Placeholder scan: no red-flag marker or deferred-work phrase remains.
- Type consistency:
  - `ImportedRecipe` and `NewRecipe` are reused from `Repositories.kt`.
  - `RecipeRepository.createDraftFromText(text:)` is implemented in shared and called from Swift as `sdk.recipes.createDraftFromText(text:)`.
  - `VoiceRecipeDraft` carries the parsed `NewRecipe` plus warnings for the review form.
  - `MK` is the single design-system namespace.
