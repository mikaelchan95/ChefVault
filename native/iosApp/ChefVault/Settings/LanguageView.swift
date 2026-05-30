import SwiftUI
import ChefVaultShared

/// Single-select language list. Tapping a row writes the language code to the profile.
struct LanguageView: View {
    @Bindable var vm: SettingsViewModel

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
        List {
            ForEach(Self.languages) { language in
                Button {
                    Task {
                        await vm.update(.change(language: language.code))
                    }
                } label: {
                    HStack(spacing: CV.Spacing.md) {
                        Text(language.flag)
                        Text(language.name).foregroundStyle(.primary)
                        Spacer()
                        if language.code == current {
                            Image(systemName: "checkmark").foregroundStyle(CV.primary).fontWeight(.semibold)
                        }
                    }
                }
            }
            CVErrorLabel(message: vm.errorMessage)
        }
        .navigationTitle("Language")
        .navigationBarTitleDisplayMode(.inline)
    }
}
