import SwiftUI
import ChefVaultShared

struct RecipeLibraryView: View {
    let sdk: ChefVaultSDK
    @State private var vm: RecipeListViewModel
    @State private var query = ""
    @State private var cuisine: String? = nil
    @State private var showCreate = false
    @State private var showSort = false
    @State private var sortBy: RecipeSort = .updated

    enum RecipeSort: String, CaseIterable, Identifiable {
        case updated, name, cost
        var id: String { rawValue }
        var label: String {
            switch self {
            case .updated: return "Recently updated"
            case .name: return "Name A–Z"
            case .cost: return "Highest cost"
            }
        }
    }

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
        _vm = State(initialValue: RecipeListViewModel(repo: sdk.recipes))
    }

    private var cuisines: [String] {
        Array(Set(vm.recipes.compactMap { $0.cuisine?.nilIfBlank })).sorted()
    }

    private func recipeCost(_ r: Recipe) -> Double {
        calculateRecipeCost(ingredients: r.ingredients, servings: Int32(r.servings)).totalCosted
    }

    private var filtered: [Recipe] {
        let base = vm.recipes.filter { r in
            (cuisine == nil || r.cuisine == cuisine)
                && (query.isEmpty
                    || r.title.localizedCaseInsensitiveContains(query)
                    || (r.cuisine?.localizedCaseInsensitiveContains(query) ?? false))
        }
        switch sortBy {
        case .updated:
            return base.sorted { ($0.updatedAt.isoDate ?? .distantPast) > ($1.updatedAt.isoDate ?? .distantPast) }
        case .name:
            return base.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .cost:
            return base.sorted { recipeCost($0) > recipeCost($1) }
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                SLAppBar(title: "Recipes", kicker: "Mise en place", count: "\(vm.recipes.count)") {
                    SLIconBtn(systemName: "slider.horizontal.3", accent: sortBy != .updated) { showSort = true }
                }
                ScrollView {
                    VStack(spacing: 12) {
                        VStack(spacing: 12) {
                            SLSearchField(text: $query)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    Button { cuisine = nil } label: { SLChip(label: "All", active: cuisine == nil) }.buttonStyle(.plain)
                                    ForEach(cuisines, id: \.self) { c in
                                        Button { cuisine = (cuisine == c ? nil : c) } label: { SLChip(label: c, active: cuisine == c) }.buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, SL.Pad.screen)

                        if vm.recipes.isEmpty {
                            emptyState
                        } else {
                            LazyVStack(spacing: 11) {
                                ForEach(filtered, id: \.id) { recipe in
                                    NavigationLink(value: recipe.id) { SLRecipeRow(recipe: recipe) }
                                        .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, SL.Pad.screen)
                        }
                    }
                    .padding(.bottom, 96)
                }
            }
            .background(SLBackground())
            .navigationDestination(for: String.self) { id in
                RecipeDetailView(sdk: sdk, recipeId: id, baseServings: Int(vm.recipes.first { $0.id == id }?.servings ?? 1))
            }
            .toolbar(.hidden, for: .navigationBar)
            .overlay { SLFab { showCreate = true } }
            .task { await vm.observe() }
            .task { await vm.refresh() }
            .refreshable { await vm.refresh() }
            .sheet(isPresented: $showCreate) { CreateRecipeView(sdk: sdk) }
            .sheet(isPresented: $showSort) { sortSheet }
        }
    }

    private var sortSheet: some View {
        VStack(alignment: .leading, spacing: 0) {
            SLKicker("Sort by")
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 22)
                .padding(.bottom, 6)
            ForEach(RecipeSort.allCases) { opt in
                Button {
                    sortBy = opt
                    showSort = false
                } label: {
                    HStack {
                        Text(opt.label)
                            .font(SL.body(15.5, sortBy == opt ? .semibold : .regular))
                            .foregroundStyle(sortBy == opt ? SL.text : SL.muted)
                        Spacer()
                        if sortBy == opt {
                            Image(systemName: "checkmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(SL.accent)
                        }
                    }
                    .padding(.horizontal, SL.Pad.screen)
                    .padding(.vertical, 15)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                if opt != .cost { Divider().overlay(SL.line).padding(.leading, SL.Pad.screen) }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SLBackground())
        .presentationDetents([.height(250)])
        .presentationDragIndicator(.visible)
        .presentationBackground(SL.bg)
    }

    private var emptyState: some View {
        VStack(spacing: 6) {
            RoundedRectangle(cornerRadius: SL.R.lg).strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [5]))
                .foregroundStyle(SL.line2).frame(width: 70, height: 70)
                .overlay(Image(systemName: "fork.knife").font(.system(size: 26)).foregroundStyle(SL.accent))
                .padding(.bottom, 10)
            Text("No recipes yet").font(SL.display(19, .bold)).foregroundStyle(SL.text)
            Text("Tap + to create your first recipe").font(SL.body(13)).foregroundStyle(SL.muted)
        }
        .frame(maxWidth: .infinity).padding(.top, 60)
    }
}

/// Back-compat shim: `CollectionDetailView` still references `RecipeRowView`. Renders
/// the Service Line row until Collections is reskinned.
struct RecipeRowView: View {
    let recipe: Recipe
    var body: some View { SLRecipeRow(recipe: recipe) }
}

/// Library card row — color-hashed tile, title, meta line, ember cost + updated stamp.
struct SLRecipeRow: View {
    let recipe: Recipe

    private var tone: Int { recipe.title.unicodeScalars.reduce(0) { $0 + Int($1.value) } % 4 }
    private var costText: String? {
        let s = calculateRecipeCost(ingredients: recipe.ingredients, servings: Int32(recipe.servings))
        guard s.totalCosted > 0 else { return nil }
        return formatCurrency(amount: KotlinDouble(double: s.totalCosted), currency: "USD")
    }
    private var meta: String {
        var parts: [String] = []
        if let c = recipe.cuisine?.nilIfBlank { parts.append(c) }
        parts.append("\(recipe.servings) servings")
        if let cook = recipe.cookTime?.intValue, cook > 0 { parts.append("\(cook) min") }
        else if let prep = recipe.prepTime?.intValue, prep > 0 { parts.append("\(prep) min") }
        return parts.joined(separator: " · ")
    }

    var body: some View {
        SLCard(pad: 11) {
            HStack(spacing: 13) {
                if let img = recipe.imageUrl?.nilIfBlank, let url = URL(string: img) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else {
                            SLTile(letter: String(recipe.title.prefix(1)).uppercased(), tone: tone, size: 60)
                        }
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(SL.line2, lineWidth: 1))
                } else {
                    SLTile(letter: String(recipe.title.prefix(1)).uppercased(), tone: tone, size: 60)
                }
                VStack(alignment: .leading, spacing: 5) {
                    Text(recipe.title).font(SL.display(15.5, .bold)).foregroundStyle(SL.text).lineLimit(2)
                    Text(meta).font(SL.body(11.5)).foregroundStyle(SL.muted).lineLimit(1)
                    HStack(alignment: .firstTextBaseline) {
                        if let costText {
                            Text(costText).font(SL.mono(14, .bold)).foregroundStyle(SL.accent)
                        }
                        Spacer(minLength: 0)
                        if let upd = recipe.updatedAt.shortRelative {
                            Text("UPD \(upd)").font(SL.mono(10)).foregroundStyle(SL.faint)
                        }
                    }
                    .padding(.top, 3)
                }
            }
        }
    }
}

extension String {
    var nilIfBlank: String? { trimmingCharacters(in: .whitespaces).isEmpty ? nil : self }
    /// Parses an ISO-8601 timestamp (with or without fractional seconds); nil if unparseable.
    var isoDate: Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return iso.date(from: self) ?? ISO8601DateFormatter().date(from: self)
    }
    /// Best-effort "2d" / "3h" / "now" from an ISO-8601 timestamp; nil if unparseable.
    var shortRelative: String? {
        guard let date = isoDate else { return nil }
        let s = max(0, -date.timeIntervalSinceNow)
        if s < 3600 { return "now" }
        if s < 86_400 { return "\(Int(s / 3600))h" }
        return "\(Int(s / 86_400))d"
    }
}
