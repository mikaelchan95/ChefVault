import SwiftUI
import ChefVaultShared

private let unitOptions = ["g", "kg", "ml", "L", "pc", "tbsp", "tsp", "cup", "oz", "lb"]

struct DraftIngredient: Identifiable {
    let id = UUID()
    var name = ""
    var quantity = ""
    var unit = "g"
}

struct CreateRecipeView: View {
    let vm: RecipeListViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var cuisine = ""
    @State private var servings = 4
    @State private var ingredients: [DraftIngredient] = [DraftIngredient()]
    @State private var steps: [String] = [""]
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Recipe") {
                    TextField("Title", text: $title)
                    TextField("Cuisine (optional)", text: $cuisine)
                    Stepper("Servings: \(servings)", value: $servings, in: 1...100)
                }

                Section("Ingredients") {
                    ForEach($ingredients) { $ingredient in
                        HStack(spacing: CV.Spacing.sm) {
                            TextField("Name", text: $ingredient.name)
                            TextField("Qty", text: $ingredient.quantity)
                                .keyboardType(.decimalPad)
                                .frame(width: 56)
                            Menu(ingredient.unit) {
                                ForEach(unitOptions, id: \.self) { unit in
                                    Button(unit) { ingredient.unit = unit }
                                }
                            }
                            .tint(CV.primary)
                        }
                    }
                    .onDelete { ingredients.remove(atOffsets: $0) }
                    Button("Add ingredient") { ingredients.append(DraftIngredient()) }
                        .tint(CV.primary)
                }

                Section("Method") {
                    ForEach(steps.indices, id: \.self) { index in
                        TextField("Step \(index + 1)", text: $steps[index], axis: .vertical)
                    }
                    .onDelete { steps.remove(atOffsets: $0) }
                    Button("Add step") { steps.append("") }
                        .tint(CV.primary)
                }

                if let error = vm.errorMessage {
                    Text(error).foregroundStyle(.red).font(.footnote)
                }
            }
            .navigationTitle("New Recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || saving)
                }
            }
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }

        let newIngredients = ingredients
            .filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
            .map { NewIngredient(name: $0.name, quantity: Double($0.quantity) ?? 0, unit: $0.unit, notes: nil, costPerUnit: nil) }

        let newSteps = steps
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
            .map { NewStep(instruction: $0, timerSeconds: nil) }

        let form = NewRecipe(
            title: title,
            cuisine: cuisine.isEmpty ? nil : cuisine,
            servings: Int32(servings),
            prepTime: nil,
            cookTime: nil,
            description: nil,
            ingredients: newIngredients,
            steps: newSteps,
        )

        if await vm.add(form) { dismiss() }
    }
}
