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
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        heroImage(recipe)
                        titleAndScaling(recipe)
                        metaStrip(recipe)
                        sourceLink(recipe)
                        ingredientsSection(recipe)
                        if !recipe.steps.isEmpty { methodSection(recipe) }
                        costSection(recipe)
                        if !recipe.platingPhotos.isEmpty { platingSection(recipe) }
                    }
                    .padding(SL.Pad.screen)
                    .padding(.top, 2)
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

    // MARK: - Hero image (only when the recipe has one)

    @ViewBuilder
    private func heroImage(_ recipe: Recipe) -> some View {
        if let img = recipe.imageUrl?.nilIfBlank, let u = URL(string: img) {
            AsyncImage(url: u) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().aspectRatio(contentMode: .fill)
                case .empty:
                    ZStack { SL.surface2; ProgressView().controlSize(.small) }
                default:
                    ZStack { SL.surface2; Image(systemName: "photo").font(.system(size: 26)).foregroundStyle(SL.faint) }
                }
            }
            .frame(height: 208)
            .frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: SL.R.lg))
            .overlay(RoundedRectangle(cornerRadius: SL.R.lg).strokeBorder(SL.line, lineWidth: 1))
        }
    }

    // MARK: - Title + scaling

    private func titleAndScaling(_ recipe: Recipe) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(recipe.title)
                .font(SL.display(26, .heavy))
                .tracking(-0.6)
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
    }

    // MARK: - Meta strip (only the stats that exist)

    private func metaStrip(_ recipe: Recipe) -> some View {
        let total = (recipe.prepTime?.intValue ?? 0) + (recipe.cookTime?.intValue ?? 0)
        var chips: [(icon: String, text: String)] = []
        if let cu = recipe.cuisine?.nilIfBlank { chips.append(("globe", cu)) }
        if total > 0 { chips.append(("clock", "\(total) min")) }
        chips.append(("person.2", "\(targetServings) serving\(targetServings == 1 ? "" : "s")"))
        return HStack(spacing: 8) {
            ForEach(chips, id: \.text) { chip in
                HStack(spacing: 5) {
                    Image(systemName: chip.icon).font(.system(size: 10.5, weight: .semibold))
                    Text(chip.text).font(SL.body(12.5, .medium))
                }
                .foregroundStyle(SL.muted)
                .padding(.horizontal, 11).padding(.vertical, 7)
                .background(SL.surface, in: Capsule())
                .overlay(Capsule().strokeBorder(SL.line, lineWidth: 1))
            }
            Spacer(minLength: 0)
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

    // MARK: - Cost analysis (only when something is actually costed)

    @ViewBuilder
    private func costSection(_ recipe: Recipe) -> some View {
        let summary = calculateRecipeCost(ingredients: recipe.ingredients, servings: Int32(recipe.servings))
        if summary.costedCount > 0 {
            let total = formatCurrency(amount: KotlinDouble(double: summary.totalCosted), currency: "USD")
            let perServing = formatCurrency(amount: summary.costPerServing, currency: "USD")
            SLCard {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        SLKicker("Cost analysis")
                        Text(total).font(SL.mono(22, .bold)).foregroundStyle(SL.accent)
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
    }

    // MARK: - Ingredients

    private func ingredientsSection(_ recipe: Recipe) -> some View {
        let scaledList = scaled(recipe)
        let summary = calculateRecipeCost(ingredients: recipe.ingredients, servings: Int32(recipe.servings))
        let showCost = summary.costedCount > 0
        return VStack(alignment: .leading, spacing: 10) {
            SLKicker("Ingredients")
            VStack(spacing: 0) {
                ForEach(Array(scaledList.enumerated()), id: \.offset) { index, item in
                    ingredientRow(item, cost: showCost ? lineCost(recipe.ingredients[index]) : nil, showCost: showCost)
                        .overlay(alignment: .top) {
                            if index > 0 { SL.line.frame(height: 1) }
                        }
                }
            }
            .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md))
            .overlay(RoundedRectangle(cornerRadius: SL.R.md).strokeBorder(SL.line, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: SL.R.md))
        }
    }

    private func ingredientRow(_ item: ScaledIngredient, cost: KotlinDouble?, showCost: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            (Text(formatQuantity(item.quantity)).foregroundColor(SL.accent)
                + Text(item.unit.isEmpty ? "" : " \(item.unit)").foregroundColor(SL.muted))
                .font(SL.mono(12.5, .bold))
                .lineLimit(1).minimumScaleFactor(0.6)
                .frame(width: 92, alignment: .leading)
            Group {
                if let notes = item.notes, !notes.isEmpty {
                    (Text(item.name).foregroundColor(SL.text)
                        + Text(" · \(notes)").foregroundColor(SL.faint))
                } else {
                    Text(item.name).foregroundColor(SL.text)
                }
            }
            .font(SL.body(13.5))
            .frame(maxWidth: .infinity, alignment: .leading)
            if showCost {
                Text(cost.map { formatCurrency(amount: $0, currency: "USD") } ?? "—")
                    .font(SL.mono(11.5))
                    .foregroundStyle(cost == nil ? SL.faint : SL.text)
                    .frame(width: 54, alignment: .trailing)
            }
        }
        .padding(.horizontal, SL.Pad.card)
        .padding(.vertical, 12)
    }

    // MARK: - Method

    private func methodSection(_ recipe: Recipe) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SLKicker("Method")
            VStack(alignment: .leading, spacing: 16) {
                ForEach(Array(recipe.steps.enumerated()), id: \.offset) { index, step in
                    methodStep(index: index, step: step)
                }
            }
        }
    }

    private func methodStep(index: Int, step: Step) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(index + 1)")
                .font(SL.mono(12.5, .bold))
                .foregroundStyle(SL.onAccent)
                .frame(width: 26, height: 26)
                .background(SL.accent, in: Circle())
            VStack(alignment: .leading, spacing: 7) {
                Text(step.instruction)
                    .font(SL.body(14))
                    .lineSpacing(14 * 0.4)
                    .foregroundStyle(SL.text)
                    .fixedSize(horizontal: false, vertical: true)
                if let timer = step.timerSeconds?.intValue, timer > 0 {
                    Text("⏱ \(timerLabel(timer))")
                        .font(SL.mono(11)).foregroundStyle(SL.accent)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .overlay(Capsule().strokeBorder(SL.accent.opacity(0.35), lineWidth: 1))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 1)
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
