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

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
        _vm = State(initialValue: RecipePickerViewModel(repo: sdk.recipes))
    }

    private var canGenerate: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && !selectedRecipeIds.isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Details") {
                    TextField("Name", text: $name)
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                }

                Section("Recipes") {
                    if vm.recipes.isEmpty {
                        Text("No recipes available. Create a recipe first.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(vm.recipes, id: \.id) { recipe in
                            Button {
                                toggle(recipe.id)
                            } label: {
                                recipeRow(recipe)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Section {
                    Text("Will generate items from \(selectedRecipeIds.count) recipe\(selectedRecipeIds.count == 1 ? "" : "s")")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.footnote)
                }
            }
            .navigationTitle("New Prep List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Generate") { Task { await generate() } }
                        .disabled(!canGenerate || saving)
                }
            }
            .task { await vm.observe() }
        }
    }

    private func recipeRow(_ recipe: Recipe) -> some View {
        let selected = selectedRecipeIds.contains(recipe.id)
        return HStack(spacing: CV.Spacing.md) {
            Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(selected ? CV.primary : Color(.tertiaryLabel))
            VStack(alignment: .leading, spacing: 2) {
                Text(recipe.title).font(.subheadline.weight(.medium))
                HStack(spacing: CV.Spacing.sm) {
                    if let cuisine = recipe.cuisine, !cuisine.isEmpty { Text(cuisine) }
                    Text("\(recipe.ingredients.count) ingredient\(recipe.ingredients.count == 1 ? "" : "s")")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .contentShape(Rectangle())
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
            errorMessage = (error as NSError).localizedDescription
        }
    }
}
