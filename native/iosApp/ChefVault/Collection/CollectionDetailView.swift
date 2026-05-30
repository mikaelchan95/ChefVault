import SwiftUI
import ChefVaultShared

/// Distinct route type so pushing a recipe from a collection doesn't collide with
/// the root Collections stack's `String` destination (which routes to collections).
private struct RecipeRoute: Hashable {
    let id: String
}

/// Observes the shared collections list and exposes the single collection +
/// membership/edit/delete operations.
@MainActor
@Observable
final class CollectionDetailViewModel {
    private let repo: CollectionRepository
    let collectionId: String
    var collection: ChefVaultShared.Collection?
    var errorMessage: String?

    init(repo: CollectionRepository, collectionId: String) {
        self.repo = repo
        self.collectionId = collectionId
    }

    func observe() async {
        for await list in repo.collections {
            collection = list.first { $0.id == collectionId }
        }
    }

    func toggleMembership(recipeId: String, isMember: Bool) async {
        do {
            if isMember {
                try await repo.removeRecipe(collectionId: collectionId, recipeId: recipeId)
            } else {
                try await repo.addRecipe(collectionId: collectionId, recipeId: recipeId)
            }
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }

    func delete() async -> Bool {
        do {
            try await repo.delete(id: collectionId)
            return true
        } catch {
            errorMessage = (error as NSError).localizedDescription
            return false
        }
    }
}

struct CollectionDetailView: View {
    let sdk: ChefVaultSDK
    @State private var vm: CollectionDetailViewModel
    @State private var recipes: [Recipe] = []
    @Environment(\.dismiss) private var dismiss

    @State private var showAddRecipes = false
    @State private var showEdit = false
    @State private var confirmDelete = false

    init(sdk: ChefVaultSDK, collectionId: String) {
        self.sdk = sdk
        _vm = State(initialValue: CollectionDetailViewModel(repo: sdk.collections, collectionId: collectionId))
    }

    private func memberRecipes(_ collection: ChefVaultShared.Collection) -> [Recipe] {
        recipes.filter { collection.recipeIds.contains($0.id) }
    }

    var body: some View {
        ScrollView {
            if let collection = vm.collection {
                VStack(alignment: .leading, spacing: CV.Spacing.xl) {
                    hero(collection)
                    statsRow(collection)
                    Button { showAddRecipes = true } label: {
                        Label("Add Recipes", systemImage: "plus.circle")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(CV.primary)
                    recipesSection(collection)
                }
                .padding(CV.Spacing.lg)
            } else {
                ContentUnavailableView("Collection unavailable", systemImage: "square.stack")
                    .padding(.top, CV.Spacing.xxxl)
            }
        }
        .navigationTitle(vm.collection?.name ?? "Collection")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: RecipeRoute.self) { route in
            RecipeDetailView(
                sdk: sdk,
                recipeId: route.id,
                baseServings: Int(recipes.first { $0.id == route.id }?.servings ?? 1),
            )
        }
        .toolbar {
            if vm.collection != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button { showEdit = true } label: { Label("Edit", systemImage: "pencil") }
                        Button(role: .destructive) { confirmDelete = true } label: { Label("Delete", systemImage: "trash") }
                    } label: { Image(systemName: "ellipsis.circle") }
                }
            }
        }
        .task { await vm.observe() }
        .task { await observeRecipes() }
        .sheet(isPresented: $showAddRecipes) {
            if let collection = vm.collection {
                AddRecipesSheet(allRecipes: recipes, selectedIds: Set(collection.recipeIds)) { recipeId, isMember in
                    Task { await vm.toggleMembership(recipeId: recipeId, isMember: isMember) }
                }
            }
        }
        .sheet(isPresented: $showEdit) {
            if let collection = vm.collection {
                EditCollectionView(sdk: sdk, collection: collection)
            }
        }
        .confirmationDialog("Delete this collection?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                Task { if await vm.delete() { dismiss() } }
            }
        }
    }

    private func observeRecipes() async {
        for await list in sdk.recipes.recipes {
            recipes = list
        }
    }

    // MARK: - Sections

    private func hero(_ collection: ChefVaultShared.Collection) -> some View {
        VStack(alignment: .leading, spacing: CV.Spacing.md) {
            ZStack(alignment: .bottomLeading) {
                heroColor(for: collection)
                    .frame(height: 120)
                    .frame(maxWidth: .infinity)
                Image(systemName: collection.icon ?? "square.stack")
                    .font(.largeTitle)
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(CV.Spacing.lg)
            }
            .clipShape(RoundedRectangle(cornerRadius: CV.Radius.lg))
            HStack {
                Text(collection.name).font(.title.bold())
                Spacer()
                CollectionStatusBadge(status: collection.status)
            }
            if let description = collection.description_, !description.isEmpty {
                Text(description).font(.subheadline).foregroundStyle(.secondary)
            }
        }
    }

    private func statsRow(_ collection: ChefVaultShared.Collection) -> some View {
        CVCard {
            HStack {
                statItem("Recipes", "\(collection.recipeIds.count)")
                Spacer()
                statItem("Created", String(collection.createdAt.prefix(10)))
            }
        }
    }

    private func statItem(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased()).font(.caption2).foregroundStyle(.secondary)
            Text(value).font(.title3.bold()).foregroundStyle(CV.primary)
        }
    }

    private func recipesSection(_ collection: ChefVaultShared.Collection) -> some View {
        let members = memberRecipes(collection)
        return VStack(alignment: .leading, spacing: CV.Spacing.md) {
            CVSectionHeader(title: "Recipes")
            if members.isEmpty {
                Text("No recipes in this collection yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(members, id: \.id) { recipe in
                    NavigationLink(value: RecipeRoute(id: recipe.id)) {
                        RecipeRowView(recipe: recipe)
                    }
                    .buttonStyle(.plain)
                    if recipe.id != members.last?.id { Divider() }
                }
            }
        }
    }
}

/// Toggle checklist of every recipe; tapping a row toggles collection membership.
struct AddRecipesSheet: View {
    let allRecipes: [Recipe]
    let selectedIds: Set<String>
    /// (recipeId, isCurrentlyMember) — caller adds/removes accordingly.
    let onToggle: (String, Bool) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if allRecipes.isEmpty {
                    ContentUnavailableView("No recipes", systemImage: "fork.knife",
                                           description: Text("Create recipes first to add them here"))
                } else {
                    List(allRecipes, id: \.id) { recipe in
                        let isMember = selectedIds.contains(recipe.id)
                        Button {
                            onToggle(recipe.id, isMember)
                        } label: {
                            HStack {
                                RecipeRowView(recipe: recipe)
                                Spacer()
                                Image(systemName: isMember ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(isMember ? CV.primary : .secondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Add Recipes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }
}

/// Edits a collection's name / description / status via `update(id:form:)`.
struct EditCollectionView: View {
    let sdk: ChefVaultSDK
    let collection: ChefVaultShared.Collection
    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var description: String
    @State private var status: CollectionStatus
    @State private var saving = false
    @State private var errorMessage: String?

    init(sdk: ChefVaultSDK, collection: ChefVaultShared.Collection) {
        self.sdk = sdk
        self.collection = collection
        _name = State(initialValue: collection.name)
        _description = State(initialValue: collection.description_ ?? "")
        _status = State(initialValue: collection.status)
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespaces) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Collection") {
                    TextField("Name", text: $name)
                    TextField("Description", text: $description, axis: .vertical).lineLimit(2...4)
                }
                Section("Status") {
                    Picker("Status", selection: $status) {
                        Text("Active").tag(CollectionStatus.active)
                        Text("Draft").tag(CollectionStatus.draft)
                    }
                    .pickerStyle(.segmented)
                }
                if let errorMessage { Text(errorMessage).foregroundStyle(.red).font(.footnote) }
            }
            .navigationTitle("Edit Collection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(trimmedName.isEmpty || saving)
                }
            }
        }
    }

    private func save() async {
        saving = true
        errorMessage = nil
        defer { saving = false }
        let form = NewCollection(
            name: trimmedName,
            description: description.isEmpty ? nil : description,
            color: collection.color,
            icon: collection.icon,
            status: status,
        )
        do {
            try await sdk.collections.update(id: collection.id, form: form)
            dismiss()
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}
