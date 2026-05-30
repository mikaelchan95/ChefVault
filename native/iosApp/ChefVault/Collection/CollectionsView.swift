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
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
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
            VStack(spacing: 0) {
                SLAppBar(title: "Collections", kicker: "Grouped recipes", count: "\(vm.collections.count)")
                ScrollView {
                    VStack(spacing: 12) {
                        SLSearchField(text: $query, placeholder: "Search collections…")
                            .padding(.horizontal, SL.Pad.screen)

                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(filtered, id: \.id) { collection in
                                NavigationLink(value: collection.id) {
                                    CollectionCard(collection: collection)
                                }
                                .buttonStyle(.plain)
                            }
                            Button { showCreate = true } label: { NewCollectionTile() }
                                .buttonStyle(.plain)
                        }
                        .padding(.horizontal, SL.Pad.screen)
                    }
                    .padding(.bottom, 96)
                }
            }
            .background(SLBackground())
            .navigationDestination(for: String.self) { collectionId in
                CollectionDetailView(sdk: sdk, collectionId: collectionId)
            }
            .toolbar(.hidden, for: .navigationBar)
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

/// Tone gradients keyed by a stable hash of the collection — one of four ember/sage/violet/steel pairs.
private let collectionTones: [[Color]] = [
    [Color(hex: 0x2A1D14), Color(hex: 0x3A2415)],
    [Color(hex: 0x15231C), Color(hex: 0x1C3327)],
    [Color(hex: 0x241A25), Color(hex: 0x2F2036)],
    [Color(hex: 0x1A2230), Color(hex: 0x22304A)],
]

/// Grid card: gradient hero with a zero-padded mono count, then name + recipe count.
struct CollectionCard: View {
    let collection: ChefVaultShared.Collection

    private var count: Int { collection.recipeIds.count }
    private var tone: Int { collection.id.unicodeScalars.reduce(0) { $0 + Int($1.value) } % 4 }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            LinearGradient(colors: collectionTones[tone], startPoint: .topLeading, endPoint: .bottomTrailing)
                .frame(height: 78)
                .frame(maxWidth: .infinity)
                .overlay(alignment: .bottomLeading) {
                    Text(String(format: "%02d", count))
                        .font(SL.mono(10, .bold))
                        .foregroundStyle(SL.accent)
                        .padding(SL.Pad.card)
                }
            VStack(alignment: .leading, spacing: 4) {
                Text(collection.name)
                    .font(SL.display(13.5, .bold))
                    .foregroundStyle(SL.text)
                    .lineSpacing(1.1)
                    .lineLimit(2)
                Text("\(count) recipe\(count == 1 ? "" : "s")")
                    .font(SL.body(11))
                    .foregroundStyle(SL.muted)
            }
            .padding(SL.Pad.card)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md))
        .clipShape(RoundedRectangle(cornerRadius: SL.R.md))
        .overlay(RoundedRectangle(cornerRadius: SL.R.md).strokeBorder(SL.line, lineWidth: 1))
    }
}

/// Dashed "add" tile that opens the create sheet.
struct NewCollectionTile: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "plus")
                .font(.system(size: 26, weight: .regular))
                .foregroundStyle(SL.accent)
            Text("New Collection")
                .font(SL.body(12, .semibold))
                .foregroundStyle(SL.muted)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: 142)
        .background(RoundedRectangle(cornerRadius: SL.R.md).fill(Color.clear))
        .overlay(
            RoundedRectangle(cornerRadius: SL.R.md)
                .strokeBorder(SL.line2, style: StrokeStyle(lineWidth: 1.5, dash: [5])),
        )
    }
}
