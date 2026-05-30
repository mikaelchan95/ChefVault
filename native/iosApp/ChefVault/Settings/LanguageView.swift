import SwiftUI
import ChefVaultShared

/// Single-select language list. Tapping a row writes the language code to the profile.
/// Service Line sub-screen: hidden system nav bar, SLSubHeader at top, ember background.
struct LanguageView: View {
    @Bindable var vm: SettingsViewModel
    @Environment(\.dismiss) private var dismiss

    struct Language: Identifiable {
        let code: String
        let flag: String
        let name: String
        var id: String { code }
    }

    static let languages: [Language] = [
        Language(code: "en", flag: "🇺🇸", name: "English"),
        Language(code: "es", flag: "🇪🇸", name: "Español"),
        Language(code: "fr", flag: "🇫🇷", name: "Français"),
        Language(code: "de", flag: "🇩🇪", name: "Deutsch"),
        Language(code: "it", flag: "🇮🇹", name: "Italiano"),
        Language(code: "pt", flag: "🇧🇷", name: "Português"),
        Language(code: "ja", flag: "🇯🇵", name: "日本語"),
        Language(code: "zh", flag: "🇨🇳", name: "中文"),
    ]

    static func label(for code: String) -> String {
        languages.first { $0.code == code }?.name ?? "English"
    }

    private var current: String { vm.profile?.language ?? "en" }

    var body: some View {
        VStack(spacing: 0) {
            SLSubHeader(title: "Language", back: "Settings") { dismiss() }
            ScrollView {
                VStack(spacing: 11) {
                    VStack(spacing: 0) {
                        ForEach(Array(Self.languages.enumerated()), id: \.element.id) { index, language in
                            if index > 0 { SLDivider() }
                            languageRow(language)
                        }
                    }
                    .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md))
                    .overlay(RoundedRectangle(cornerRadius: SL.R.md).strokeBorder(SL.line, lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: SL.R.md))
                    if let message = vm.errorMessage {
                        Text(message).font(SL.body(12.5)).foregroundStyle(SL.danger)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 18)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
    }

    private func languageRow(_ language: Language) -> some View {
        let selected = language.code == current
        return Button {
            Task {
                await vm.update(.change(language: language.code))
            }
        } label: {
            HStack(spacing: 12) {
                Text(language.flag).font(.system(size: 20))
                Text(language.name)
                    .font(SL.body(14, selected ? .bold : .regular))
                    .foregroundStyle(SL.text)
                Spacer(minLength: 0)
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(SL.accent)
                }
            }
            .padding(.horizontal, SL.Pad.screen)
            .padding(.vertical, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
