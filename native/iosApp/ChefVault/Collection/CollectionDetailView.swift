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

/// Tone gradients keyed by a stable hash of the collection — one of four ember/sage/violet/steel pairs.
private let collectionDetailTones: [[Color]] = [
    [Color(hex: 0x2A1D14), Color(hex: 0x3A2415)],
    [Color(hex: 0x15231C), Color(hex: 0x1C3327)],
    [Color(hex: 0x241A25), Color(hex: 0x2F2036)],
    [Color(hex: 0x1A2230), Color(hex: 0x22304A)],
]

/// Service Line status pill — Active uses the ember accent, Draft a neutral surface.
struct SLCollectionStatusPill: View {
    let status: CollectionStatus

    private var isActive: Bool { status == .active }

    var body: some View {
        Text((isActive ? "Active" : "Draft").uppercased())
            .font(SL.mono(9.5, .bold))
            .tracking(0.8)
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .foregroundStyle(isActive ? SL.accent : SL.muted)
            .background(isActive ? SL.accentSoft : SL.surface2, in: Capsule())
            .overlay(Capsule().strokeBorder(isActive ? SL.accent.opacity(0.35) : SL.line, lineWidth: 1))
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

    private func tone(for collection: ChefVaultShared.Collection) -> Int {
        collection.id.unicodeScalars.reduce(0) { $0 + Int($1.value) } % 4
    }

    var body: some View {
        VStack(spacing: 0) {
            backRow
            if let collection = vm.collection {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        hero(collection)
                        VStack(alignment: .leading, spacing: 18) {
                            statsRow(collection)
                            addRecipesBar
                            recipesSection(collection)
                            footnote
                        }
                        .padding(SL.Pad.screen)
                    }
                    .padding(.bottom, 40)
                }
            } else {
                Spacer()
                VStack(spacing: 6) {
                    Image(systemName: "square.stack").font(.system(size: 26)).foregroundStyle(SL.accent)
                    Text("Collection unavailable").font(SL.display(19, .bold)).foregroundStyle(SL.text)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: RecipeRoute.self) { route in
            RecipeDetailView(
                sdk: sdk,
                recipeId: route.id,
                baseServings: Int(recipes.first { $0.id == route.id }?.servings ?? 1),
            )
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

    // MARK: - Back row

    private var backRow: some View {
        HStack(spacing: 10) {
            Button(action: { dismiss() }) {
                HStack(spacing: 3) {
                    Image(systemName: "chevron.left").font(.system(size: 13, weight: .semibold))
                    Text("Collections").font(SL.body(14, .semibold))
                }
                .foregroundStyle(SL.muted)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            if vm.collection != nil {
                Menu {
                    Button { showEdit = true } label: { Label("Edit", systemImage: "pencil") }
                    Button(role: .destructive) { confirmDelete = true } label: { Label("Delete", systemImage: "trash") }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(width: 38, height: 38)
                        .foregroundStyle(SL.text)
                        .background(SL.surface, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(SL.line2, lineWidth: 1))
                }
            }
        }
        .padding(.horizontal, SL.Pad.screen)
        .padding(.top, 6)
        .padding(.bottom, 12)
    }

    // MARK: - Sections

    private func hero(_ collection: ChefVaultShared.Collection) -> some View {
        let count = collection.recipeIds.count
        let statusLabel = collection.status == .active ? "active" : "draft"
        return ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: collectionDetailTones[tone(for: collection)],
                startPoint: .topLeading, endPoint: .bottomTrailing,
            )
            .frame(height: 140)
            .frame(maxWidth: .infinity)
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: collection.icon ?? "square.stack")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.7))
                Text(collection.name)
                    .font(SL.display(24, .heavy))
                    .tracking(-0.5)
                    .foregroundStyle(SL.text)
                    .fixedSize(horizontal: false, vertical: true)
                Text("\(count) recipe\(count == 1 ? "" : "s") · \(statusLabel)")
                    .font(SL.mono(11.5))
                    .foregroundStyle(SL.muted)
            }
            .padding(SL.Pad.screen)
        }
        .overlay(SL.line.frame(height: 1), alignment: .bottom)
    }

    private func statsRow(_ collection: ChefVaultShared.Collection) -> some View {
        SLCard(soft: true) {
            HStack(alignment: .top) {
                statItem("Recipes", "\(collection.recipeIds.count)")
                Spacer()
                statItem("Status", collection.status == .active ? "Active" : "Draft")
                Spacer()
                statItem("Created", String(collection.createdAt.prefix(10)))
            }
        }
    }

    private func statItem(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            SLKicker(label)
            Text(value).font(SL.display(16, .bold)).foregroundStyle(SL.text).lineLimit(1)
        }
    }

    private var addRecipesBar: some View {
        SLButton(title: "Manage Recipes", variant: .secondary, icon: "plus", full: true) {
            showAddRecipes = true
        }
    }

    private func recipesSection(_ collection: ChefVaultShared.Collection) -> some View {
        let members = memberRecipes(collection)
        return VStack(alignment: .leading, spacing: 10) {
            SLKicker("Recipes")
            if members.isEmpty {
                emptyRecipes
            } else {
                VStack(spacing: 11) {
                    ForEach(members, id: \.id) { recipe in
                        NavigationLink(value: RecipeRoute(id: recipe.id)) {
                            RecipeRowView(recipe: recipe)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var emptyRecipes: some View {
        SLCard(soft: true) {
            VStack(spacing: 6) {
                Image(systemName: "fork.knife").font(.system(size: 22)).foregroundStyle(SL.faint)
                Text("No recipes yet").font(SL.display(15, .bold)).foregroundStyle(SL.text)
                Text("Tap Manage Recipes to add some.").font(SL.body(12.5)).foregroundStyle(SL.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
    }

    private var footnote: some View {
        Text("Recipes are many-to-many — one recipe can live in several collections.")
            .font(SL.body(11.5))
            .foregroundStyle(SL.faint)
            .lineSpacing(2)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Toggle checklist of every recipe; tapping a row toggles collection membership.
struct AddRecipesSheet: View {
    let allRecipes: [Recipe]
    let selectedIds: Set<String>
    /// (recipeId, isCurrentlyMember) — caller adds/removes accordingly.
    let onToggle: (String, Bool) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var query = ""
    /// Local mirror of membership so the checklist reflects taps instantly while the
    /// shared StateFlow propagates back through the parent.
    @State private var selected: Set<String> = []

    private var filtered: [Recipe] {
        guard !query.isEmpty else { return allRecipes }
        return allRecipes.filter { $0.title.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        VStack(spacing: 0) {
            sheetHeader
            if allRecipes.isEmpty {
                Spacer()
                VStack(spacing: 6) {
                    Image(systemName: "fork.knife").font(.system(size: 26)).foregroundStyle(SL.accent)
                    Text("No recipes").font(SL.display(18, .bold)).foregroundStyle(SL.text)
                    Text("Create recipes first to add them here").font(SL.body(12.5)).foregroundStyle(SL.muted)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        SLSearchField(text: $query)
                            .padding(.horizontal, SL.Pad.screen)
                            .padding(.bottom, 10)
                        VStack(spacing: 0) {
                            ForEach(filtered, id: \.id) { recipe in
                                recipeToggleRow(recipe)
                            }
                        }
                        .padding(.horizontal, SL.Pad.screen)
                    }
                    .padding(.top, 6)
                    .padding(.bottom, 40)
                }
            }
        }
        .background(SLBackground())
        .presentationDragIndicator(.visible)
        .onAppear { selected = selectedIds }
    }

    private func recipeToggleRow(_ recipe: Recipe) -> some View {
        let isMember = selected.contains(recipe.id)
        let tone = recipe.title.unicodeScalars.reduce(0) { $0 + Int($1.value) } % 4
        return Button {
            onToggle(recipe.id, isMember)
            if isMember { selected.remove(recipe.id) } else { selected.insert(recipe.id) }
        } label: {
            HStack(spacing: 12) {
                SLTile(letter: String(recipe.title.prefix(1)).uppercased(), tone: tone, size: 42)
                Text(recipe.title)
                    .font(SL.display(13.5, .bold))
                    .foregroundStyle(SL.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .lineLimit(2)
                Image(systemName: isMember ? "checkmark" : "plus")
                    .font(.system(size: 14, weight: .bold))
                    .frame(width: 28, height: 28)
                    .foregroundStyle(isMember ? SL.onAccent : SL.muted)
                    .background(isMember ? SL.accent : .clear, in: Circle())
                    .overlay(Circle().strokeBorder(isMember ? SL.accent : SL.line2, lineWidth: 1.5))
            }
            .padding(.vertical, 11)
            .contentShape(Rectangle())
            .overlay(SL.line.frame(height: 1), alignment: .bottom)
        }
        .buttonStyle(.plain)
    }

    private var sheetHeader: some View {
        ZStack {
            Text("Manage Recipes").font(SL.display(16, .bold)).foregroundStyle(SL.text)
            Button("Done") { dismiss() }
                .font(SL.body(14.5, .bold))
                .foregroundStyle(SL.accent)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, SL.Pad.screen)
        .frame(height: 52)
        .overlay(SL.line.frame(height: 1), alignment: .bottom)
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

    private var statusIndex: Binding<Int> {
        Binding(
            get: { status == .active ? 0 : 1 },
            set: { status = $0 == 0 ? .active : .draft },
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            sheetHeader
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 7) {
                        SLKicker("Name")
                        SLTextField(placeholder: "Collection name", text: $name)
                    }
                    VStack(alignment: .leading, spacing: 7) {
                        SLKicker("Description")
                        SLTextField(placeholder: "Optional description", text: $description)
                    }
                    VStack(alignment: .leading, spacing: 7) {
                        SLKicker("Status")
                        SLSegmented(selection: statusIndex, options: ["Active", "Draft"])
                    }
                    if let errorMessage {
                        Text(errorMessage).font(SL.body(12.5)).foregroundStyle(SL.danger)
                    }
                    SLDivider().padding(.vertical, 4)
                    SLButton(title: "Save Changes", icon: "checkmark", full: true, busy: saving) {
                        Task { await save() }
                    }
                    .disabled(trimmedName.isEmpty || saving)
                    Text("Recipes themselves are never deleted.")
                        .font(SL.body(11))
                        .foregroundStyle(SL.faint)
                        .frame(maxWidth: .infinity)
                }
                .padding(SL.Pad.screen)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .presentationDragIndicator(.visible)
    }

    private var sheetHeader: some View {
        ZStack {
            Text("Edit Collection").font(SL.display(16, .bold)).foregroundStyle(SL.text)
            Button("Cancel") { dismiss() }
                .font(SL.body(14.5))
                .foregroundStyle(SL.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, SL.Pad.screen)
        .frame(height: 52)
        .overlay(SL.line.frame(height: 1), alignment: .bottom)
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
