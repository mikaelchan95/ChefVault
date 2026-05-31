import SwiftUI
import ChefVaultShared

/// Observes the shared recipe list so the multi-select picker stays in sync.
@MainActor
@Observable
private final class RecipePickerViewModel {
    private let repo: RecipeRepository
    var recipes: [Recipe] = []

    init(repo: RecipeRepository) {
        self.repo = repo
    }

    func observe() async {
        for await list in repo.recipes {
            recipes = list
        }
    }
}

struct CreatePrepListView: View {
    let sdk: ChefVaultSDK
    @Environment(\.dismiss) private var dismiss

    @State private var vm: RecipePickerViewModel
    @State private var name = ""
    @State private var date = Date()
    @State private var selectedRecipeIds: Set<String> = []
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var showPaywall = false

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
        _vm = State(initialValue: RecipePickerViewModel(repo: sdk.recipes))
    }

    private var canGenerate: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && !selectedRecipeIds.isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    nameSection
                    dateSection
                    SLDivider()
                    recipesSection
                    previewSection
                    if let errorMessage {
                        Text(errorMessage).font(SL.body(12.5)).foregroundStyle(SL.danger)
                    }
                }
                .padding(SL.Pad.screen)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .tint(SL.accent)
        .task { await vm.observe() }
        .paywallSheet(isPresented: $showPaywall)
    }

    // MARK: Header

    private var header: some View {
        VStack(spacing: 12) {
            Capsule().fill(SL.line2).frame(width: 38, height: 5).padding(.top, 8)
            HStack {
                Button("Cancel") { dismiss() }
                    .font(SL.body(14)).foregroundStyle(SL.muted)
                Spacer()
                Text("New Prep List")
                    .font(SL.display(16, .bold)).foregroundStyle(SL.text)
                Spacer()
                Button { Task { await generate() } } label: {
                    if saving { ProgressView().tint(SL.accent) }
                    else { Text("Generate").font(SL.body(14, .bold)).foregroundStyle(SL.accent) }
                }
                .disabled(!canGenerate || saving)
                .opacity(canGenerate && !saving ? 1 : 0.4)
            }
            .padding(.horizontal, SL.Pad.screen)
            .padding(.bottom, 12)
        }
        .overlay(SLDivider(), alignment: .bottom)
    }

    // MARK: Sections

    private var nameSection: some View {
        VStack(alignment: .leading, spacing: 7) {
            SLKicker("List name")
            SLTextField(placeholder: "Friday Dinner Service", text: $name, systemImage: "list.bullet.rectangle")
        }
    }

    private var dateSection: some View {
        VStack(alignment: .leading, spacing: 7) {
            SLKicker("Service date")
            HStack(spacing: 9) {
                Image(systemName: "calendar").font(.system(size: 14)).foregroundStyle(SL.faint).frame(width: 18)
                DatePicker("", selection: $date, displayedComponents: .date)
                    .labelsHidden()
                    .font(SL.body(15))
                    .tint(SL.accent)
                Spacer()
            }
            .padding(.horizontal, 13)
            .frame(height: 46)
            .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm))
            .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line2, lineWidth: 1))
        }
    }

    private var recipesSection: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack {
                SLKicker("Select recipes")
                Spacer()
                Text("\(selectedRecipeIds.count) SELECTED")
                    .font(SL.mono(10.5, .bold)).foregroundStyle(SL.accent)
            }
            if vm.recipes.isEmpty {
                Text("No recipes available. Create a recipe first.")
                    .font(SL.body(13)).foregroundStyle(SL.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 8)
            } else {
                VStack(spacing: 9) {
                    ForEach(Array(vm.recipes.enumerated()), id: \.element.id) { index, recipe in
                        Button { toggle(recipe.id) } label: {
                            recipeRow(recipe, tone: index)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func recipeRow(_ recipe: Recipe, tone: Int) -> some View {
        let selected = selectedRecipeIds.contains(recipe.id)
        return HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(selected ? SL.accent : .clear)
                    .overlay(Circle().strokeBorder(selected ? .clear : SL.line2, lineWidth: 1.5))
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(SL.onAccent)
                }
            }
            .frame(width: 22, height: 22)

            SLTile(letter: String(recipe.title.prefix(1)).uppercased(), tone: tone, size: 34, corner: 9)

            VStack(alignment: .leading, spacing: 2) {
                Text(recipe.title).font(SL.display(13.5, .bold)).foregroundStyle(SL.text)
                HStack(spacing: 6) {
                    if let cuisine = recipe.cuisine, !cuisine.isEmpty {
                        Text(cuisine)
                        Text("·").foregroundStyle(SL.faint)
                    }
                    Text("\(recipe.ingredients.count) ingredient\(recipe.ingredients.count == 1 ? "" : "s")")
                }
                .font(SL.mono(10.5)).foregroundStyle(SL.muted)
            }
            Spacer(minLength: 0)
        }
        .padding(11)
        .background(selected ? SL.accentSoft : SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm))
        .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(selected ? SL.accent : SL.line, lineWidth: 1))
        .contentShape(Rectangle())
    }

    private var previewSection: some View {
        SLCard(soft: true) {
            VStack(alignment: .leading, spacing: 9) {
                SLKicker("Live preview")
                Text("Will generate items from \(selectedRecipeIds.count) recipe\(selectedRecipeIds.count == 1 ? "" : "s")")
                    .font(SL.body(13)).foregroundStyle(SL.muted)
            }
        }
    }

    private func toggle(_ id: String) {
        if selectedRecipeIds.contains(id) {
            selectedRecipeIds.remove(id)
        } else {
            selectedRecipeIds.insert(id)
        }
    }

    private func generate() async {
        saving = true
        errorMessage = nil
        defer { saving = false }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        do {
            _ = try await sdk.prepLists.createFromRecipes(
                name: name,
                date: formatter.string(from: date),
                recipeIds: Array(selectedRecipeIds),
            )
            dismiss()
        } catch {
            if error.isFreePlanLimit {
                showPaywall = true
            } else {
                errorMessage = (error as NSError).localizedDescription
            }
        }
    }
}
