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
