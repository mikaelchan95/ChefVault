import SwiftUI
import ChefVaultShared

struct PrepListsView: View {
    let sdk: ChefVaultSDK
    @State private var vm: PrepListsViewModel
    @State private var selectedListId: String?
    @State private var filter: ItemFilter = .all
    @State private var showCreate = false
    @State private var confirmDelete = false

    init(sdk: ChefVaultSDK) {
        self.sdk = sdk
        _vm = State(initialValue: PrepListsViewModel(repo: sdk.prepLists))
    }

    private enum ItemFilter: String, CaseIterable, Identifiable {
        case all = "All"
        case todo = "To-Do"
        case completed = "Completed"
        var id: String { rawValue }
    }

    /// The currently selected list, falling back to the first available.
    private var selectedList: PrepList? {
        if let id = selectedListId, let match = vm.lists.first(where: { $0.id == id }) {
            return match
        }
        return vm.lists.first
    }

    private func filteredItems(_ list: PrepList) -> [PrepItem] {
        switch filter {
        case .all: return list.items
        case .todo: return list.items.filter { !$0.checked }
        case .completed: return list.items.filter { $0.checked }
        }
    }

    /// Items grouped by station, sorted alphabetically by station name.
    private func sections(_ list: PrepList) -> [(station: String, items: [PrepItem])] {
        let grouped = Dictionary(grouping: filteredItems(list), by: { $0.station })
        return grouped
            .map { (station: $0.key, items: $0.value) }
            .sorted { $0.station < $1.station }
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.lists.isEmpty {
                    ContentUnavailableView(
                        "No prep lists yet",
                        systemImage: "checklist",
                        description: Text("Tap + to generate a prep list from your recipes"),
                    )
                } else if let list = selectedList {
                    content(for: list)
                }
            }
            .navigationTitle("Prep Lists")
            .toolbar {
                if selectedList != nil {
                    ToolbarItem(placement: .topBarLeading) {
                        Button(role: .destructive) { confirmDelete = true } label: {
                            Image(systemName: "trash")
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showCreate = true } label: { Image(systemName: "plus") }
                }
            }
            .task { await vm.observe() }
            .task { await vm.refresh() }
            .refreshable { await vm.refresh() }
            .sheet(isPresented: $showCreate) {
                CreatePrepListView(sdk: sdk)
            }
            .confirmationDialog(
                "Delete this prep list?",
                isPresented: $confirmDelete,
                titleVisibility: .visible,
            ) {
                if let list = selectedList {
                    Button("Delete", role: .destructive) {
                        Task {
                            await vm.delete(id: list.id)
                            selectedListId = vm.lists.first { $0.id != list.id }?.id
                        }
                    }
                }
            }
        }
    }

    private func content(for list: PrepList) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: CV.Spacing.lg) {
                listSelector
                progressCard(for: list)
                Picker("Filter", selection: $filter) {
                    ForEach(ItemFilter.allCases) { option in
                        Text(option.rawValue).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                itemSections(for: list)
            }
            .padding(CV.Spacing.lg)
        }
    }

    private var listSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: CV.Spacing.sm) {
                ForEach(vm.lists, id: \.id) { list in
                    CVChip(label: list.name, selected: list.id == selectedList?.id) {
                        selectedListId = list.id
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private func progressCard(for list: PrepList) -> some View {
        let total = list.items.count
        let done = list.items.filter { $0.checked }.count
        let fraction = total > 0 ? Double(done) / Double(total) : 0
        let complete = total > 0 && done == total
        return CVCard {
            VStack(alignment: .leading, spacing: CV.Spacing.sm) {
                HStack {
                    Text(list.date).font(.subheadline.weight(.medium))
                    Spacer()
                    Text("\(Int((fraction * 100).rounded()))%")
                        .font(.subheadline.bold().monospacedDigit())
                        .foregroundStyle(complete ? .green : CV.primary)
                }
                ProgressView(value: fraction)
                    .tint(complete ? .green : CV.primary)
                Text("\(done) of \(total) done")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func itemSections(for list: PrepList) -> some View {
        let grouped = sections(list)
        return Group {
            if grouped.isEmpty {
                Text("Nothing here.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, CV.Spacing.xl)
            } else {
                ForEach(grouped, id: \.station) { section in
                    VStack(alignment: .leading, spacing: CV.Spacing.sm) {
                        CVSectionHeader(title: section.station)
                        CVCard {
                            VStack(spacing: 0) {
                                ForEach(Array(section.items.enumerated()), id: \.element.id) { index, item in
                                    PrepItemRow(item: item) {
                                        Task { await vm.toggle(listId: list.id, itemId: item.id) }
                                    }
                                    if index < section.items.count - 1 { Divider() }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct PrepItemRow: View {
    let item: PrepItem
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: CV.Spacing.md) {
                Image(systemName: item.checked ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(item.checked ? CV.primary : Color(.tertiaryLabel))
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.subheadline)
                        .strikethrough(item.checked, color: .secondary)
                        .foregroundStyle(item.checked ? .secondary : .primary)
                    if let notes = item.notes, !notes.isEmpty {
                        Text(notes).font(.caption).italic().foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Text("\(formatQuantity(item.quantity)) \(item.unit)")
                    .font(.subheadline.weight(.semibold).monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, CV.Spacing.sm)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
