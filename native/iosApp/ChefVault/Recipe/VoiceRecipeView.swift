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

struct VoiceRecipeView: View {
    let sdk: ChefVaultSDK
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var vm: VoiceRecipeViewModel
    @State private var parsedDraft: NewRecipe?
    @State private var recordingPulse = false

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
        _vm = State(initialValue: VoiceRecipeViewModel(
            recorder: SpeechRecipeRecorder(),
            parser: SDKVoiceRecipeParser(sdk: sdk),
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
        .onChange(of: vm.state) { _, state in
            if state == .ready {
                parsedDraft = vm.draft?.recipe
            }
            recordingPulse = state == .recording
        }
    }

    private var recordingSheet: some View {
        VStack(spacing: 0) {
            MKSubHeader(title: "Talk Recipe", back: "Close") {
                vm.cancelRecording()
                dismiss()
            }
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
                .padding(.bottom, 24)
            }
        }
        .background(MKBackground())
    }

    private var micButton: some View {
        Button {
            Task {
                if vm.state == .recording {
                    await vm.finishRecording()
                } else {
                    await vm.startRecording()
                }
            }
        } label: {
            ZStack {
                if vm.state == .recording {
                    Circle()
                        .fill(MK.accentSoft)
                        .frame(width: 116, height: 116)
                        .scaleEffect(reduceMotion ? 1 : (recordingPulse ? 1.18 : 1.04) + min(vm.audioLevel, 0.24))
                        .opacity(reduceMotion ? 0.42 : (recordingPulse ? 0.22 : 0.48))
                        .animation(
                            reduceMotion ? .none : .easeInOut(duration: 1.05).repeatForever(autoreverses: true),
                            value: recordingPulse,
                        )
                }
                Circle()
                    .fill(vm.state == .recording ? MK.accent : MK.surface)
                    .frame(width: 94, height: 94)
                    .overlay(Circle().strokeBorder(vm.state == .recording ? MK.accent : MK.line2, lineWidth: 1))
                Image(systemName: vm.state == .recording ? "stop.fill" : "waveform")
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(vm.state == .recording ? MK.onAccent : MK.accent)
            }
        }
        .buttonStyle(MKPressStyle())
        .mkAnimated(vm.state)
        .onAppear { recordingPulse = vm.state == .recording }
        .accessibilityLabel(vm.state == .recording ? "Finish recording" : "Start recording")
    }

    private var transcriptCard: some View {
        MKCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    MKSectionHeader(title: vm.state == .recording ? "Listening" : "Transcript")
                    Spacer()
                    levelBars
                }
                Text(vm.transcript.isEmpty ? "Your transcript will appear here as you speak." : vm.transcript)
                    .font(MK.body(15))
                    .foregroundStyle(vm.transcript.isEmpty ? MK.faint : MK.text)
                    .lineSpacing(3)
                    .frame(maxWidth: .infinity, minHeight: 130, alignment: .topLeading)
            }
        }
    }

    private var levelBars: some View {
        HStack(spacing: 3) {
            ForEach(0..<3, id: \.self) { index in
                Capsule()
                    .fill(vm.state == .recording ? MK.accent : MK.line2)
                    .frame(width: 4, height: 8 + CGFloat(index + 1) * 4 + CGFloat(vm.audioLevel * 18))
                    .opacity(vm.state == .recording ? 1 : 0.45)
            }
        }
        .frame(height: 28, alignment: .center)
        .mkAnimated(vm.audioLevel)
    }

    private var controls: some View {
        VStack(spacing: 10) {
            switch vm.state {
            case .idle, .failed:
                MKButton(title: "Start talking", icon: "mic", full: true) {
                    Task { await vm.startRecording() }
                }
            case .requestingPermission:
                MKButton(title: "Requesting access", full: true, busy: true) {}
            case .recording:
                MKButton(title: "Finish and create draft", icon: "checkmark", full: true) {
                    Task { await vm.finishRecording() }
                }
                MKButton(title: "Cancel recording", variant: .secondary, full: true) {
                    vm.cancelRecording()
                }
            case .parsing:
                MKButton(title: "Creating draft", full: true, busy: true) {}
            case .ready:
                MKButton(title: "Opening review", full: true, busy: true) {}
            }
        }
    }
}
