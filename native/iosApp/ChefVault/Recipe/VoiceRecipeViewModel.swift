import Foundation
import Observation
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

    var canFinish: Bool {
        transcript.trimmedForRecipeVoice.count >= 24 && state == .recording
    }

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
