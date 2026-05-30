import SwiftUI
import ChefVaultShared

struct RecipeLibraryView: View {
    let sdk: ChefVaultSDK
    @State private var vm: RecipeListViewModel
    @State private var query = ""
    @State private var showCreate = false

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
        _vm = State(initialValue: RecipeListViewModel(repo: sdk.recipes))
    }

    private var filtered: [Recipe] {
        guard !query.isEmpty else { return vm.recipes }
        return vm.recipes.filter {
            $0.title.localizedCaseInsensitiveContains(query)
                || ($0.cuisine?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.recipes.isEmpty {
                    ContentUnavailableView(
                        "No recipes yet",
                        systemImage: "fork.knife",
                        description: Text("Tap + to create your first recipe"),
                    )
                } else {
                    List(filtered, id: \.id) { recipe in
                        NavigationLink(value: recipe.id) {
                            RecipeRowView(recipe: recipe)
                        }
                    }
                    .listStyle(.plain)
                    .searchable(text: $query, prompt: "Search recipes")
                }
            }
            .navigationTitle("Recipes")
            .navigationDestination(for: String.self) { recipeId in
                RecipeDetailView(
                    sdk: sdk,
                    recipeId: recipeId,
                    baseServings: Int(vm.recipes.first { $0.id == recipeId }?.servings ?? 1),
                )
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showCreate = true } label: { Image(systemName: "plus") }
                }
            }
            .refreshable { await vm.refresh() }
            .task { await vm.observe() }
            .task { await vm.refresh() }
            .sheet(isPresented: $showCreate) {
                CreateRecipeView(sdk: sdk)
            }
        }
    }
}

struct RecipeRowView: View {
    let recipe: Recipe

    private var costText: String? {
        let summary = calculateRecipeCost(ingredients: recipe.ingredients, servings: Int32(recipe.servings))
        guard summary.totalCosted > 0 else { return nil }
        return formatCurrency(amount: KotlinDouble(double: summary.totalCosted), currency: "USD")
    }

    var body: some View {
        HStack(spacing: CV.Spacing.lg) {
            RoundedRectangle(cornerRadius: CV.Radius.md)
                .fill(CV.primaryTint)
                .frame(width: 56, height: 56)
                .overlay(
                    Text(String(recipe.title.prefix(1)).uppercased())
                        .font(.title3.bold())
                        .foregroundStyle(CV.primary),
                )
            VStack(alignment: .leading, spacing: 4) {
                Text(recipe.title).font(.headline).lineLimit(1)
                HStack(spacing: CV.Spacing.sm) {
                    if let cuisine = recipe.cuisine, !cuisine.isEmpty { Text(cuisine) }
                    Text("\(recipe.servings) serv")
                    if let costText { Text("· \(costText)").foregroundStyle(CV.primary) }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
