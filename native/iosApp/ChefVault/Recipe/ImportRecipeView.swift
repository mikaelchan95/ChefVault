import SwiftUI
import UIKit
import ChefVaultShared

/// Paste a TikTok / Instagram / YouTube / recipe-page link → the server parses it into a
/// draft recipe → review in the recipe form → save. Presented as a sheet from the library.
/// Service Line sub-screen styling; the form takes over the sheet once a draft is parsed.
struct ImportRecipeView: View {
    let sdk: ChefVaultSDK
    /// Prefilled + auto-imported when opened from a share (vs. the empty paste flow).
    var initialUrl: String? = nil
    @Environment(\.dismiss) private var dismiss

    @State private var url = ""
    @State private var parsing = false
    @State private var errorMessage: String?
    @State private var draft: NewRecipe?
    @State private var warnings: [String] = []

    var body: some View {
        if let draft {
            // Review & save — the form's own dismiss closes this import sheet.
            RecipeFormView(sdk: sdk, draft: draft, warnings: warnings)
        } else {
            pasteForm
        }
    }

    private var trimmed: String { url.trimmingCharacters(in: .whitespacesAndNewlines) }

    private var pasteForm: some View {
        VStack(spacing: 0) {
            SLSubHeader(title: "Import from Link") { dismiss() }
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    SLKicker("Paste a link")
                    Text("Paste a TikTok, Instagram, YouTube, or recipe-page link. ChefVault reads it and fills in a recipe you can review.")
                        .font(SL.body(12.5)).foregroundStyle(SL.muted)
                    SLTextField(placeholder: "https://…", text: $url)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    if let errorMessage {
                        Text(errorMessage).font(SL.body(12.5)).foregroundStyle(SL.danger)
                    }
                    SLButton(title: parsing ? "Reading the recipe…" : "Import recipe", full: true, busy: parsing) {
                        Task { await parse() }
                    }
                    .disabled(trimmed.isEmpty || parsing)
                    Text("Watches the video or reads the page to pull out ingredients and steps. Nothing is saved until you review and tap Save.")
                        .font(SL.mono(9.5)).foregroundStyle(SL.faint)
                        .padding(.top, 2)
                }
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 18)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            guard url.isEmpty else { return }
            if let initialUrl, !initialUrl.isEmpty {
                // Shared in → prefill and import straight away.
                url = initialUrl
                Task { await parse() }
            } else if let clip = UIPasteboard.general.string, clip.lowercased().hasPrefix("http") {
                // Prefill from the clipboard (the common "I just copied a link" case).
                url = clip
            }
        }
    }

    private func parse() async {
        parsing = true
        errorMessage = nil
        defer { parsing = false }
        do {
            let result = try await sdk.recipes.importFromUrl(url: trimmed)
            warnings = result.warnings
            draft = result.recipe
        } catch {
            let message = (error as NSError).localizedDescription
            errorMessage = message.isEmpty
                ? "Couldn't read a recipe from that link. Try another, or add it manually."
                : message
        }
    }
}
