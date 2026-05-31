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

    /// Segmented unit toggle is index-driven (0 = Metric, 1 = Imperial); bridge to the
    /// shared `MeasurementSystem` enum.
    private var unitIndex: Binding<Int> {
        Binding(
            get: { unitSystem == .imperial ? 1 : 0 },
            set: { unitSystem = $0 == 1 ? .imperial : .metric },
        )
    }

    var body: some View {
        // NOTE: no nested NavigationStack here — this view is pushed into the
        // Recipes tab's NavigationStack. Wrapping it in its own stack renders blank
        // (matches the working CollectionDetailView, which is also a plain pushed view).
        VStack(spacing: 0) {
            backRow
            if let recipe = vm.recipe {
                controlBar(recipe)
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        metaGrid(recipe)
                        sourceLink(recipe)
                        costCard(recipe)
                        ingredientsSection(recipe)
                        if !recipe.steps.isEmpty { methodSection(recipe) }
                        if !recipe.platingPhotos.isEmpty { platingSection(recipe) }
                    }
                    .padding(SL.Pad.screen)
                    .padding(.bottom, 40)
                }
            } else {
                Spacer()
                VStack(spacing: 6) {
                    Image(systemName: "fork.knife").font(.system(size: 26)).foregroundStyle(SL.accent)
                    Text("Recipe unavailable").font(SL.display(19, .bold)).foregroundStyle(SL.text)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
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

    private func lineCost(_ ingredient: Ingredient) -> KotlinDouble? {
        calculateScaledCost(costPerUnit: ingredient.costPerUnit, scaledQuantity: ingredient.quantity * ratio)
    }

    // MARK: - Back row + pinned control bar

    private var backRow: some View {
        HStack(spacing: 10) {
            Button(action: { dismiss() }) {
                HStack(spacing: 3) {
                    Image(systemName: "chevron.left").font(.system(size: 13, weight: .semibold))
                    Text("Recipes").font(SL.body(14, .semibold))
                }
                .foregroundStyle(SL.muted)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            if let recipe = vm.recipe {
                ShareLink(item: shareText(recipe)) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(width: 38, height: 38)
                        .foregroundStyle(SL.text)
                        .background(SL.surface, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(SL.line2, lineWidth: 1))
                }
                .buttonStyle(.plain)
                Menu {
                    Button { showEdit = true } label: { Label("Edit", systemImage: "pencil") }
                    Button(role: .destructive) { confirmDelete = true } label: { Label("Delete", systemImage: "trash") }
                } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(width: 38, height: 38)
                        .foregroundStyle(SL.onAccent)
                        .background(SL.accent, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .padding(.horizontal, SL.Pad.screen)
        .padding(.top, 6)
        .padding(.bottom, 12)
    }

    private func controlBar(_ recipe: Recipe) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(recipe.title)
                .font(SL.display(23, .heavy))
                .tracking(-0.6)
                .lineSpacing(23 * 0.02)
                .foregroundStyle(SL.text)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 10) {
                SLStepper(value: $targetServings, range: 1...100)
                Text("SERVINGS").font(SL.mono(10.5, .regular)).tracking(1).foregroundStyle(SL.faint)
                Spacer(minLength: 0)
                SLSegmented(selection: unitIndex, options: ["Metric", "Imperial"])
                    .frame(width: 150)
            }
        }
        .padding(.horizontal, SL.Pad.screen)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SL.surface)
        .overlay(SL.line.frame(height: 1), alignment: .bottom)
        .shadow(color: .black.opacity(0.18), radius: 8, y: 4)
    }

    // MARK: - Meta grid

    private func metaGrid(_ recipe: Recipe) -> some View {
        HStack(spacing: 10) {
            metaCard("Cuisine", recipe.cuisine?.nilIfBlank ?? "—")
            metaCard("Prep", recipe.prepTime.map { "\($0.intValue)m" } ?? "—")
            metaCard("Cook", recipe.cookTime.map { "\($0.intValue)m" } ?? "—")
        }
    }

    private func metaCard(_ kicker: String, _ value: String) -> some View {
        SLCard(pad: SL.Pad.card, soft: true) {
            VStack(spacing: 6) {
                SLKicker(kicker)
                Text(value).font(SL.display(16, .bold)).foregroundStyle(SL.text).lineLimit(1)
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Source link (imported recipes)

    @ViewBuilder
    private func sourceLink(_ recipe: Recipe) -> some View {
        if let src = recipe.sourceUrl?.nilIfBlank, let u = URL(string: src) {
            Link(destination: u) {
                HStack(spacing: 6) {
                    Image(systemName: "link").font(.system(size: 11, weight: .semibold))
                    Text("View original").font(SL.body(12.5, .semibold))
                    Spacer(minLength: 0)
                    Image(systemName: "arrow.up.right").font(.system(size: 10, weight: .semibold))
                }
                .foregroundStyle(SL.accent)
                .padding(.horizontal, 13).padding(.vertical, 11)
                .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md))
                .overlay(RoundedRectangle(cornerRadius: SL.R.md).strokeBorder(SL.line, lineWidth: 1))
            }
        }
    }

    // MARK: - Cost analysis

    private func costCard(_ recipe: Recipe) -> some View {
        let summary = calculateRecipeCost(ingredients: recipe.ingredients, servings: Int32(recipe.servings))
        let total = formatCurrency(amount: KotlinDouble(double: summary.totalCosted), currency: "USD")
        let perServing = formatCurrency(amount: summary.costPerServing, currency: "USD")
        return SLCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    SLKicker("Cost analysis")
                    Text(total).font(SL.mono(24, .bold)).foregroundStyle(SL.accent)
                    Text("\(perServing) / serving").font(SL.mono(11.5)).foregroundStyle(SL.muted)
                }
                Spacer(minLength: 0)
                Text("\(summary.costedCount)/\(summary.totalCount) COSTED")
                    .font(SL.mono(10, .bold))
                    .foregroundStyle(SL.accent)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(SL.accentSoft, in: Capsule())
            }
        }
    }

    // MARK: - Ingredients

    private func ingredientsSection(_ recipe: Recipe) -> some View {
        let scaledList = scaled(recipe)
        return VStack(alignment: .leading, spacing: 10) {
            SLKicker("Ingredients")
            VStack(spacing: 0) {
                ingredientHeader
                ForEach(Array(scaledList.enumerated()), id: \.offset) { index, item in
                    ingredientRow(item, cost: lineCost(recipe.ingredients[index]))
                        .overlay(SL.line.frame(height: 1), alignment: .top)
                }
            }
            .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md))
            .overlay(RoundedRectangle(cornerRadius: SL.R.md).strokeBorder(SL.line, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: SL.R.md))
        }
    }

    private var ingredientHeader: some View {
        HStack(spacing: 0) {
            Text("QTY").frame(width: 36, alignment: .leading)
            Text("UNIT").frame(width: 58, alignment: .leading)
            Text("INGREDIENT").frame(maxWidth: .infinity, alignment: .leading)
            Text("COST").frame(width: 54, alignment: .trailing)
        }
        .font(SL.mono(9, .bold))
        .tracking(0.8)
        .foregroundStyle(SL.faint)
        .padding(.horizontal, SL.Pad.card)
        .padding(.vertical, 9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SL.surface2)
    }

    private func ingredientRow(_ item: ScaledIngredient, cost: KotlinDouble?) -> some View {
        HStack(alignment: .top, spacing: 0) {
            Text(formatQuantity(item.quantity))
                .font(SL.mono(12, .bold)).foregroundStyle(SL.accent)
                .lineLimit(1)
                .frame(width: 36, alignment: .leading)
            Text(item.unit)
                .font(SL.mono(11)).foregroundStyle(SL.muted)
                .lineLimit(1).minimumScaleFactor(0.6)
                .frame(width: 58, alignment: .leading)
            Group {
                if let notes = item.notes, !notes.isEmpty {
                    (Text(item.name).foregroundColor(SL.text)
                        + Text(" · \(notes)").foregroundColor(SL.faint))
                } else {
                    Text(item.name).foregroundColor(SL.text)
                }
            }
            .font(SL.body(13))
            .frame(maxWidth: .infinity, alignment: .leading)
            Text(cost.map { formatCurrency(amount: $0, currency: "USD") } ?? "—")
                .font(SL.mono(11.5))
                .foregroundStyle(cost == nil ? SL.faint : SL.text)
                .frame(width: 54, alignment: .trailing)
        }
        .padding(.horizontal, SL.Pad.card)
        .padding(.vertical, 11)
    }

    // MARK: - Method

    private func methodSection(_ recipe: Recipe) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SLKicker("Method")
            ZStack(alignment: .topLeading) {
                // timeline spine
                SL.line2.frame(width: 2).padding(.leading, 13).padding(.vertical, 14)
                VStack(alignment: .leading, spacing: 18) {
                    ForEach(Array(recipe.steps.enumerated()), id: \.offset) { index, step in
                        methodStep(index: index, step: step)
                    }
                }
            }
            .padding(.leading, 30)
        }
    }

    private func methodStep(index: Int, step: Step) -> some View {
        HStack(alignment: .top, spacing: 0) {
            Text("\(index + 1)")
                .font(SL.mono(12, .bold))
                .foregroundStyle(SL.onAccent)
                .frame(width: 28, height: 28)
                .background(SL.accent, in: Circle())
                .offset(x: -30)
                .frame(width: 0, alignment: .leading)
            VStack(alignment: .leading, spacing: 6) {
                Text(step.instruction).font(SL.body(13)).lineSpacing(13 * 0.45).foregroundStyle(SL.text)
                if let timer = step.timerSeconds?.intValue, timer > 0 {
                    Text("⏱ \(timerLabel(timer))")
                        .font(SL.mono(11)).foregroundStyle(SL.accent)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .overlay(Capsule().strokeBorder(SL.accent.opacity(0.35), lineWidth: 1))
                }
            }
        }
    }

    private func timerLabel(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }

    // MARK: - Plating

    private func platingSection(_ recipe: Recipe) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SLKicker("Plating")
            PlatingPhotosViewer(photos: recipe.platingPhotos)
        }
    }

    // MARK: - Share

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
