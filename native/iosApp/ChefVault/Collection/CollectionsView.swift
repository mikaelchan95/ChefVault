import SwiftUI
import ChefVaultShared

struct CollectionsView: View {
    let sdk: ChefVaultSDK
    @State private var vm: CollectionsViewModel
    @State private var query = ""
    @State private var showCreate = false

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
        _vm = State(initialValue: CollectionsViewModel(repo: sdk.collections))
    }

    private let columns = [
        GridItem(.flexible(), spacing: CV.Spacing.lg),
        GridItem(.flexible(), spacing: CV.Spacing.lg),
    ]

    private var filtered: [ChefVaultShared.Collection] {
        guard !query.isEmpty else { return vm.collections }
        return vm.collections.filter {
            $0.name.localizedCaseInsensitiveContains(query)
                || ($0.description_?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.collections.isEmpty {
                    ContentUnavailableView(
                        "No collections yet",
                        systemImage: "square.stack",
                        description: Text("Tap + to group recipes into a collection"),
                    )
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: CV.Spacing.lg) {
                            ForEach(filtered, id: \.id) { collection in
                                NavigationLink(value: collection.id) {
                                    CollectionCard(collection: collection)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(CV.Spacing.lg)
                    }
                    .searchable(text: $query, prompt: "Search collections")
                }
            }
            .navigationTitle("Collections")
            .navigationDestination(for: String.self) { collectionId in
                CollectionDetailView(sdk: sdk, collectionId: collectionId)
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
                CreateCollectionView(sdk: sdk)
            }
        }
    }
}

/// Status pill — Active uses orange tint, Draft uses a neutral gray.
struct CollectionStatusBadge: View {
    let status: CollectionStatus

    private var isActive: Bool { status == .active }
    private var label: String { isActive ? "Active" : "Draft" }
    private var tint: Color { isActive ? CV.primary : .secondary }

    var body: some View {
        Text(label)
            .font(.caption2.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(tint.opacity(0.18), in: Capsule())
            .foregroundStyle(tint)
    }
}

/// Grid card: a colored hero block with icon + name, then count + status footer.
struct CollectionCard: View {
    let collection: ChefVaultShared.Collection

    private var icon: String { collection.icon ?? "square.stack" }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                heroColor(for: collection)
                    .frame(height: 96)
                    .frame(maxWidth: .infinity)
                Image(systemName: icon)
                    .font(.title)
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(CV.Spacing.md)
            }
            VStack(alignment: .leading, spacing: CV.Spacing.sm) {
                Text(collection.name)
                    .font(.headline)
                    .lineLimit(1)
                HStack {
                    Text("\(collection.recipeIds.count) recipe\(collection.recipeIds.count == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    CollectionStatusBadge(status: collection.status)
                }
            }
            .padding(CV.Spacing.md)
        }
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: CV.Radius.lg))
        .clipShape(RoundedRectangle(cornerRadius: CV.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: CV.Radius.lg)
                .strokeBorder(Color(.separator).opacity(0.5), lineWidth: 0.5),
        )
    }
}
