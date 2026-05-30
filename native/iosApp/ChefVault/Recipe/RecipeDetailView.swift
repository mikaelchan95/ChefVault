import SwiftUI
import ChefVaultShared

/// Observes the shared recipe list and exposes the single recipe + delete.
@MainActor
@Observable
final class RecipeDetailViewModel {
    private let repo: RecipeRepository
    let recipeId: String
    var recipe: Recipe?
    var errorMessage: String?

    init(repo: RecipeRepository, recipeId: String) {
        self.repo = repo
        self.recipeId = recipeId
    }

    func observe() async {
        for await list in repo.recipes {
            recipe = list.first { $0.id == recipeId }
        }
    }

    func delete() async -> Bool {
        do {
            try await repo.delete(id: recipeId)
            return true
        } catch {
            errorMessage = (error as NSError).localizedDescription
            return false
        }
    }
}

struct RecipeDetailView: View {
    let sdk: ChefVaultSDK
    @State private var vm: RecipeDetailViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var targetServings: Int
    @State private var unitSystem: MeasurementSystem = .metric
    @State private var showEdit = false
    @State private var confirmDelete = false

    init(sdk: ChefVaultSDK, recipeId: String, baseServings: Int) {
        self.sdk = sdk
        _vm = State(initialValue: RecipeDetailViewModel(repo: sdk.recipes, recipeId: recipeId))
        _targetServings = State(initialValue: baseServings)
    }

    var body: some View {
        ScrollView {
            if let recipe = vm.recipe {
                VStack(alignment: .leading, spacing: CV.Spacing.xl) {
                    header(recipe)
                    servingsScaler(recipe)
                    unitToggle
                    ingredientsCard(recipe)
                    costCard(recipe)
                    if !recipe.steps.isEmpty { methodCard(recipe) }
                    if !recipe.platingPhotos.isEmpty {
                        VStack(alignment: .leading, spacing: CV.Spacing.md) {
                            CVSectionHeader(title: "Plating")
                            PlatingPhotosViewer(photos: recipe.platingPhotos)
                        }
                    }
                }
                .padding(CV.Spacing.lg)
            } else {
                ContentUnavailableView("Recipe unavailable", systemImage: "fork.knife")
                    .padding(.top, CV.Spacing.xxxl)
            }
        }
        .navigationTitle(vm.recipe?.title ?? "Recipe")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let recipe = vm.recipe {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button { showEdit = true } label: { Label("Edit", systemImage: "pencil") }
                        ShareLink(item: shareText(recipe)) { Label("Share", systemImage: "square.and.arrow.up") }
                        Button(role: .destructive) { confirmDelete = true } label: { Label("Delete", systemImage: "trash") }
                    } label: { Image(systemName: "ellipsis.circle") }
                }
            }
        }
        .task { await vm.observe() }
        .sheet(isPresented: $showEdit) {
            if let recipe = vm.recipe { RecipeEditView(sdk: sdk, recipe: recipe) }
        }
        .confirmationDialog("Delete this recipe?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                Task { if await vm.delete() { dismiss() } }
            }
        }
    }

    // MARK: - Derived (pure, recomputed on servings/unit change)

    private var ratio: Double {
        guard let base = vm.recipe?.servings, base > 0 else { return 1 }
        return Double(targetServings) / Double(base)
    }

    private func scaled(_ recipe: Recipe) -> [ScaledIngredient] {
        scaleRecipeIngredients(
            ingredients: recipe.ingredients,
            baseServings: Int32(recipe.servings),
            targetServings: Int32(targetServings),
            preferredSystem: unitSystem,
        )
    }

    // MARK: - Sections

    private func header(_ recipe: Recipe) -> some View {
        VStack(alignment: .leading, spacing: CV.Spacing.sm) {
            Text(recipe.title).font(.title.bold())
            if let description = recipe.description_, !description.isEmpty {
                Text(description).font(.subheadline).foregroundStyle(.secondary)
            }
            HStack(spacing: CV.Spacing.xl) {
                if let cuisine = recipe.cuisine, !cuisine.isEmpty { metaItem("Cuisine", cuisine) }
                if let prep = recipe.prepTime?.intValue { metaItem("Prep", "\(prep)m") }
                if let cook = recipe.cookTime?.intValue { metaItem("Cook", "\(cook)m") }
            }
        }
    }

    private func metaItem(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased()).font(.caption2).foregroundStyle(.secondary)
            Text(value).font(.subheadline.weight(.medium))
        }
    }

    private func servingsScaler(_ recipe: Recipe) -> some View {
        CVCard {
            HStack {
                Text("Servings").font(.headline)
                Spacer()
                Stepper(value: $targetServings, in: 1...100) {
                    Text("\(targetServings)").font(.title3.bold()).foregroundStyle(CV.primary)
                }
                .labelsHidden()
                .fixedSize()
                Text("\(targetServings)").font(.title3.bold()).foregroundStyle(CV.primary).monospacedDigit()
            }
        }
    }

    private var unitToggle: some View {
        Picker("Units", selection: $unitSystem) {
            Text("Metric").tag(MeasurementSystem.metric)
            Text("Imperial").tag(MeasurementSystem.imperial)
        }
        .pickerStyle(.segmented)
    }

    private func ingredientsCard(_ recipe: Recipe) -> some View {
        let scaledList = scaled(recipe)
        return CVCard {
            VStack(alignment: .leading, spacing: CV.Spacing.md) {
                CVSectionHeader(title: "Ingredients")
                ForEach(Array(scaledList.enumerated()), id: \.offset) { index, item in
                    HStack(alignment: .top, spacing: CV.Spacing.md) {
                        Text("\(formatQuantity(item.quantity)) \(item.unit)")
                            .font(.subheadline.weight(.semibold).monospacedDigit())
                            .frame(width: 96, alignment: .leading)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.name).font(.subheadline)
                            if let notes = item.notes, !notes.isEmpty {
                                Text(notes).font(.caption).italic().foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if let cost = lineCost(recipe.ingredients[index]) {
                            Text(formatCurrency(amount: cost, currency: "USD"))
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(CV.primary)
                        }
                    }
                    if index < scaledList.count - 1 { Divider() }
                }
            }
        }
    }

    private func lineCost(_ ingredient: Ingredient) -> KotlinDouble? {
        calculateScaledCost(costPerUnit: ingredient.costPerUnit, scaledQuantity: ingredient.quantity * ratio)
    }

    private func costCard(_ recipe: Recipe) -> some View {
        let summary = calculateRecipeCost(ingredients: recipe.ingredients, servings: Int32(recipe.servings))
        return Group {
            if summary.totalCosted > 0 {
                CVCard {
                    VStack(alignment: .leading, spacing: CV.Spacing.md) {
                        HStack {
                            CVSectionHeader(title: "Cost Analysis")
                            if !summary.isComplete {
                                Text("Partial").font(.caption2.bold()).padding(.horizontal, 6).padding(.vertical, 2)
                                    .background(Color.orange.opacity(0.2), in: Capsule()).foregroundStyle(.orange)
                            }
                        }
                        HStack {
                            costMetric("Total", formatCurrency(amount: KotlinDouble(double: summary.totalCosted), currency: "USD"))
                            Spacer()
                            costMetric("Per Serving", formatCurrency(amount: summary.costPerServing, currency: "USD"))
                        }
                    }
                }
            }
        }
    }

    private func costMetric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased()).font(.caption2).foregroundStyle(.secondary)
            Text(value).font(.title3.bold()).foregroundStyle(CV.primary)
        }
    }

    private func methodCard(_ recipe: Recipe) -> some View {
        CVCard {
            VStack(alignment: .leading, spacing: CV.Spacing.lg) {
                CVSectionHeader(title: "Method")
                ForEach(Array(recipe.steps.enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .top, spacing: CV.Spacing.md) {
                        Text("\(index + 1)")
                            .font(.subheadline.bold())
                            .frame(width: 28, height: 28)
                            .background(CV.primaryTint, in: Circle())
                            .foregroundStyle(CV.primary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(step.instruction).font(.subheadline)
                            if let timer = step.timerSeconds?.intValue, timer > 0 {
                                Label("\(timer / 60)m", systemImage: "timer").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private func shareText(_ recipe: Recipe) -> String {
        var lines = ["\(recipe.title)", ""]
        lines.append("Ingredients:")
        for item in scaled(recipe) { lines.append("• \(formatQuantity(item.quantity)) \(item.unit) \(item.name)") }
        if !recipe.steps.isEmpty {
            lines.append("")
            lines.append("Method:")
            for (index, step) in recipe.steps.enumerated() { lines.append("\(index + 1). \(step.instruction)") }
        }
        return lines.joined(separator: "\n")
    }
}
