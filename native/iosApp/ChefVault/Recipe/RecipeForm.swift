import SwiftUI
import ChefVaultShared

// Unit + cuisine picker options come from the shared module (single source of truth).
private let unitOptions = ModelsKt.UNITS
private let cuisineOptions = ModelsKt.CUISINES

private struct DraftIngredient: Identifiable {
    let id = UUID()
    var name = ""
    var quantity = ""
    var unit = "g"
    var cost = ""
}

private struct DraftStep: Identifiable {
    let id = UUID()
    var instruction = ""
    var timerMinutes = ""
}

/// Thin entry points — create vs. edit share `RecipeFormView`.
struct CreateRecipeView: View {
    let sdk: ChefVaultSDK
    var body: some View { RecipeFormView(sdk: sdk, existing: nil) }
}

struct RecipeEditView: View {
    let sdk: ChefVaultSDK
    let recipe: Recipe
    var body: some View { RecipeFormView(sdk: sdk, existing: recipe) }
}

struct RecipeFormView: View {
    let sdk: ChefVaultSDK
    let existing: Recipe?
    @Environment(\.dismiss) private var dismiss

    @State private var title: String
    @State private var cuisine: String
    @State private var servings: Int
    @State private var prepTime: String
    @State private var cookTime: String
    @State private var description: String
    @State private var ingredients: [DraftIngredient]
    @State private var steps: [DraftStep]
    @State private var photos: [String]
    @State private var saving = false
    @State private var errorMessage: String?

    init(sdk: ChefVaultSDK, existing: Recipe?) {
        self.sdk = sdk
        self.existing = existing
        _title = State(initialValue: existing?.title ?? "")
        _cuisine = State(initialValue: existing?.cuisine ?? "")
        _servings = State(initialValue: Int(existing?.servings ?? 4))
        _prepTime = State(initialValue: existing?.prepTime.map { "\($0.intValue)" } ?? "")
        _cookTime = State(initialValue: existing?.cookTime.map { "\($0.intValue)" } ?? "")
        _description = State(initialValue: existing?.description_ ?? "")
        _photos = State(initialValue: existing?.platingPhotos ?? [])
        _ingredients = State(initialValue: existing?.ingredients.map {
            DraftIngredient(name: $0.name, quantity: formatQuantity($0.quantity), unit: $0.unit,
                            cost: $0.costPerUnit.map { c in formatQuantity(c.doubleValue) } ?? "")
        } ?? [DraftIngredient()])
        _steps = State(initialValue: existing?.steps.map {
            DraftStep(instruction: $0.instruction, timerMinutes: $0.timerSeconds.map { t in "\(t.intValue / 60)" } ?? "")
        } ?? [DraftStep()])
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Recipe") {
                    TextField("Title", text: $title)
                    Stepper("Servings: \(servings)", value: $servings, in: 1...100)
                    HStack {
                        TextField("Prep (min)", text: $prepTime).keyboardType(.numberPad)
                        Divider()
                        TextField("Cook (min)", text: $cookTime).keyboardType(.numberPad)
                    }
                    TextField("Description", text: $description, axis: .vertical).lineLimit(2...4)
                }

                Section("Cuisine") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: CV.Spacing.sm) {
                            ForEach(cuisineOptions, id: \.self) { option in
                                CVChip(label: option, selected: cuisine == option) {
                                    cuisine = (cuisine == option) ? "" : option
                                }
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }

                Section("Ingredients") {
                    ForEach($ingredients) { $ingredient in
                        VStack(spacing: CV.Spacing.xs) {
                            TextField("Name", text: $ingredient.name)
                            HStack(spacing: CV.Spacing.sm) {
                                TextField("Qty", text: $ingredient.quantity).keyboardType(.decimalPad).frame(width: 56)
                                Menu(ingredient.unit) {
                                    ForEach(unitOptions, id: \.self) { unit in
                                        Button(unit) { ingredient.unit = unit }
                                    }
                                }.tint(CV.primary)
                                Divider()
                                TextField("$/unit", text: $ingredient.cost).keyboardType(.decimalPad)
                            }
                        }
                    }
                    .onDelete { ingredients.remove(atOffsets: $0) }
                    Button("Add ingredient") { ingredients.append(DraftIngredient()) }.tint(CV.primary)
                }

                Section("Method") {
                    ForEach($steps) { $step in
                        VStack(spacing: CV.Spacing.xs) {
                            TextField("Instruction", text: $step.instruction, axis: .vertical)
                            TextField("Timer (min, optional)", text: $step.timerMinutes).keyboardType(.numberPad)
                        }
                    }
                    .onDelete { steps.remove(atOffsets: $0) }
                    Button("Add step") { steps.append(DraftStep()) }.tint(CV.primary)
                }

                Section { PlatingPhotosEditor(photos: $photos, storage: sdk.storage) }

                if let errorMessage { Text(errorMessage).foregroundStyle(.red).font(.footnote) }
            }
            .navigationTitle(existing == nil ? "New Recipe" : "Edit Recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || saving)
                }
            }
        }
    }

    private func buildForm() -> NewRecipe {
        let newIngredients = ingredients
            .filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
            .map { NewIngredient(name: $0.name, quantity: Double($0.quantity) ?? 0, unit: $0.unit,
                                 notes: nil, costPerUnit: $0.cost.isEmpty ? nil : KotlinDouble(double: Double($0.cost) ?? 0)) }
        let newSteps = steps
            .filter { !$0.instruction.trimmingCharacters(in: .whitespaces).isEmpty }
            .map { NewStep(instruction: $0.instruction,
                           timerSeconds: $0.timerMinutes.isEmpty ? nil : KotlinInt(int: (Int32($0.timerMinutes) ?? 0) * 60)) }
        return NewRecipe(
            title: title,
            cuisine: cuisine.isEmpty ? nil : cuisine,
            servings: Int32(servings),
            prepTime: prepTime.isEmpty ? nil : KotlinInt(int: Int32(prepTime) ?? 0),
            cookTime: cookTime.isEmpty ? nil : KotlinInt(int: Int32(cookTime) ?? 0),
            description: description.isEmpty ? nil : description,
            imageUrl: photos.first,
            platingPhotos: photos,
            ingredients: newIngredients,
            steps: newSteps,
        )
    }

    private func save() async {
        saving = true
        errorMessage = nil
        defer { saving = false }
        let form = buildForm()
        do {
            if let existing {
                try await sdk.recipes.update(id: existing.id, form: form)
            } else {
                _ = try await sdk.recipes.addRecipe(form: form)
            }
            dismiss()
        } catch {
            let message = (error as NSError).localizedDescription
            errorMessage = (message.contains("limit") || message.contains("50"))
                ? "Free plan limit reached (50 recipes). Upgrade to Pro for unlimited."
                : message
        }
    }
}
