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
    @State private var showPaywall = false

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

    private var canSave: Bool { !title.trimmingCharacters(in: .whitespaces).isEmpty && !saving }

    /// Running total = Σ (cost/unit × quantity) over draft ingredients.
    private var runningTotal: Double {
        ingredients.reduce(0) { sum, ing in
            sum + (Double(ing.cost) ?? 0) * (Double(ing.quantity) ?? 0)
        }
    }
    private var runningTotalText: String {
        formatCurrency(amount: KotlinDouble(double: runningTotal), currency: "USD")
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    titleSection
                    cuisineSection
                    timingSection
                    SLDivider()
                    ingredientsSection
                    SLDivider()
                    methodSection
                    PlatingPhotosEditor(photos: $photos, storage: sdk.storage)
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
                Text(existing == nil ? "New Recipe" : "Edit Recipe")
                    .font(SL.display(16, .bold)).foregroundStyle(SL.text)
                Spacer()
                Button { Task { await save() } } label: {
                    if saving { ProgressView().tint(SL.accent) }
                    else { Text("Save").font(SL.body(14, .bold)).foregroundStyle(SL.accent) }
                }
                .disabled(!canSave)
                .opacity(canSave ? 1 : 0.4)
            }
            .padding(.horizontal, SL.Pad.screen)
            .padding(.bottom, 12)
        }
        .overlay(SLDivider(), alignment: .bottom)
    }

    // MARK: Sections

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 7) {
            SLKicker("Title")
            TextField("", text: $title, prompt: Text("Recipe title").foregroundColor(SL.faint))
                .font(SL.body(15, .semibold)).foregroundStyle(SL.text)
                .padding(.horizontal, 13).frame(height: 44)
                .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm))
                .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line2, lineWidth: 1))
        }
    }

    private var cuisineSection: some View {
        VStack(alignment: .leading, spacing: 9) {
            SLKicker("Cuisine")
            FlowLayout(spacing: 7) {
                ForEach(cuisineOptions, id: \.self) { option in
                    Button { cuisine = (cuisine == option) ? "" : option } label: {
                        SLChip(label: option, active: cuisine == option)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var timingSection: some View {
        HStack(spacing: 10) {
            monoField(kicker: "Servings", text: Binding(
                get: { "\(servings)" },
                set: { servings = max(1, min(100, Int($0) ?? servings)) }))
            monoField(kicker: "Prep", text: $prepTime)
            monoField(kicker: "Cook", text: $cookTime)
        }
    }

    private func monoField(kicker: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SLKicker(kicker)
            TextField("", text: text)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(SL.mono(15, .bold)).foregroundStyle(SL.accent)
                .frame(maxWidth: .infinity).frame(height: 42)
                .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm))
                .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line2, lineWidth: 1))
        }
    }

    private var ingredientsSection: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack {
                SLKicker("Ingredients")
                Spacer()
                Text("\(runningTotalText) running").font(SL.mono(10.5, .bold)).foregroundStyle(SL.accent)
            }
            ForEach($ingredients) { $ingredient in
                IngInput(ingredient: $ingredient) {
                    ingredients.removeAll { $0.id == ingredient.id }
                }
            }
            SLButton(title: "Add ingredient", variant: .secondary, icon: "plus", small: true, full: true) {
                ingredients.append(DraftIngredient())
            }
        }
    }

    private var methodSection: some View {
        VStack(alignment: .leading, spacing: 11) {
            SLKicker("Method")
            ForEach(Array($steps.enumerated()), id: \.element.id) { index, $step in
                StepInput(number: index + 1, step: $step) {
                    steps.removeAll { $0.id == step.id }
                }
            }
            SLButton(title: "Add step", variant: .secondary, icon: "plus", small: true, full: true) {
                steps.append(DraftStep())
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
            if error.isFreePlanLimit {
                showPaywall = true
            } else {
                errorMessage = (error as NSError).localizedDescription
            }
        }
    }
}

// MARK: - Ingredient row

/// One ingredient draft: mono qty box, unit menu box, flexible name field, delete.
private struct IngInput: View {
    @Binding var ingredient: DraftIngredient
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 7) {
            TextField("", text: $ingredient.quantity, prompt: Text("0").foregroundColor(SL.faint))
                .keyboardType(.decimalPad).multilineTextAlignment(.center)
                .font(SL.mono(13, .bold)).foregroundStyle(SL.accent)
                .frame(width: 42, height: 40)
                .background(SL.surface, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(SL.line2, lineWidth: 1))

            Menu {
                ForEach(unitOptions, id: \.self) { unit in
                    Button(unit) { ingredient.unit = unit }
                }
            } label: {
                HStack(spacing: 3) {
                    Text(ingredient.unit).font(SL.body(12, .semibold))
                    Image(systemName: "chevron.down").font(.system(size: 8, weight: .bold))
                }
                .foregroundStyle(SL.muted)
                .frame(width: 50, height: 40)
                .background(SL.surface, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(SL.line2, lineWidth: 1))
            }

            TextField("", text: $ingredient.name, prompt: Text("Ingredient").foregroundColor(SL.faint))
                .font(SL.body(13.5)).foregroundStyle(SL.text)
                .padding(.horizontal, 11).frame(height: 40)
                .frame(maxWidth: .infinity)
                .background(SL.surface, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(SL.line2, lineWidth: 1))

            Button(action: onDelete) {
                Image(systemName: "xmark").font(.system(size: 12, weight: .bold)).foregroundStyle(SL.faint)
                    .frame(width: 28, height: 40)
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - Method step row

/// One step draft: ember number circle + textarea-style instruction box.
private struct StepInput: View {
    let number: Int
    @Binding var step: DraftStep
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(number)")
                .font(SL.mono(12, .bold)).foregroundStyle(SL.onAccent)
                .frame(width: 28, height: 28)
                .background(SL.accent, in: Circle())

            TextField("", text: $step.instruction, prompt: Text("Describe this step…").foregroundColor(SL.faint), axis: .vertical)
                .font(SL.body(13.5)).foregroundStyle(SL.text)
                .lineLimit(2...)
                .padding(11)
                .frame(maxWidth: .infinity, minHeight: 56, alignment: .topLeading)
                .background(SL.surface, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(SL.line2, lineWidth: 1))

            Button(action: onDelete) {
                Image(systemName: "xmark").font(.system(size: 12, weight: .bold)).foregroundStyle(SL.faint)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - Flow layout (wrapping chips)

/// Minimal wrapping layout so cuisine chips flow onto multiple lines.
private struct FlowLayout: Layout {
    var spacing: CGFloat = 7

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0; y += rowHeight + spacing; rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: maxWidth, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX; y += rowHeight + spacing; rowHeight = 0
            }
            sub.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
