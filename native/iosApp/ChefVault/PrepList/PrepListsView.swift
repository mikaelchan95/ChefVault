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
        case todo = "To Do"
        case completed = "Done"
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

    /// "Service · Fri May 30" — parses the selected list's `yyyy-MM-dd` date, else today.
    private var serviceKicker: String {
        let parser = DateFormatter()
        parser.dateFormat = "yyyy-MM-dd"
        let date = selectedList.flatMap { parser.date(from: $0.date) } ?? Date()
        let out = DateFormatter()
        out.dateFormat = "EEE MMM d"
        return "Service · \(out.string(from: date))"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                SLAppBar(title: "Prep", kicker: serviceKicker) {
                    if selectedList != nil {
                        SLIconBtn(systemName: "ellipsis") { confirmDelete = true }
                    }
                }
                ScrollView {
                    if vm.lists.isEmpty {
                        emptyState
                    } else if let list = selectedList {
                        content(for: list)
                    }
                }
            }
            .background(SLBackground())
            .toolbar(.hidden, for: .navigationBar)
            .overlay { SLFab { showCreate = true } }
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
        VStack(alignment: .leading, spacing: 16) {
            listSelector
            progressBlock(for: list)
            filterRow
            itemSections(for: list)
        }
        .padding(.horizontal, SL.Pad.screen)
        .padding(.bottom, 96)
    }

    // MARK: List selector chips

    private var listSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(vm.lists, id: \.id) { list in
                    Button { selectedListId = list.id } label: {
                        SLChip(label: list.name, active: list.id == selectedList?.id)
                    }
                    .buttonStyle(.plain)
                }
                Button { showCreate = true } label: {
                    SLChip(label: "+", active: false)
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 2)
        }
    }

    // MARK: Progress block

    private func progressBlock(for list: PrepList) -> some View {
        let total = list.items.count
        let done = list.items.filter { $0.checked }.count
        let fraction = total > 0 ? Double(done) / Double(total) : 0
        return VStack(spacing: 9) {
            HStack {
                Text("\(done) / \(total) PREPPED")
                    .font(SL.mono(11)).foregroundStyle(SL.muted)
                Spacer()
                Text("\(Int((fraction * 100).rounded()))%")
                    .font(SL.mono(11, .bold)).foregroundStyle(SL.accent)
            }
            SLProgressBar(fraction: fraction)
        }
    }

    // MARK: Filter chips

    private var filterRow: some View {
        HStack(spacing: 8) {
            ForEach(ItemFilter.allCases) { option in
                Button { filter = option } label: {
                    SLChip(label: option.rawValue, active: filter == option)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: Stations + check rows

    private func itemSections(for list: PrepList) -> some View {
        let grouped = sections(list)
        return Group {
            if grouped.isEmpty {
                Text("Nothing here.")
                    .font(SL.body(13)).foregroundStyle(SL.muted)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 28)
            } else {
                ForEach(grouped, id: \.station) { section in
                    VStack(alignment: .leading, spacing: 10) {
                        StationHead(name: section.station, items: section.items)
                        VStack(spacing: 12) {
                            ForEach(section.items, id: \.id) { item in
                                CheckRow(item: item) {
                                    Task { await vm.toggle(listId: list.id, itemId: item.id) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 6) {
            RoundedRectangle(cornerRadius: SL.R.lg).strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [5]))
                .foregroundStyle(SL.line2).frame(width: 70, height: 70)
                .overlay(Image(systemName: "checklist").font(.system(size: 26)).foregroundStyle(SL.accent))
                .padding(.bottom, 10)
            Text("No prep lists yet").font(SL.display(19, .bold)).foregroundStyle(SL.text)
            Text("Tap + to generate a prep list from your recipes")
                .font(SL.body(13)).foregroundStyle(SL.muted).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.top, 60).padding(.horizontal, SL.Pad.screen)
    }
}

// MARK: - Station header

private struct StationHead: View {
    let name: String
    let items: [PrepItem]

    private var doneCount: Int { items.filter { $0.checked }.count }

    var body: some View {
        HStack(spacing: 8) {
            Text(name).font(SL.display(14.5, .bold)).foregroundStyle(SL.text)
            Text(name.uppercased())
                .font(SL.mono(9.5, .bold)).tracking(0.5)
                .foregroundStyle(SL.accent)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .overlay(Capsule().strokeBorder(SL.accent.opacity(0.5), lineWidth: 1))
            Spacer(minLength: 8)
            Text("\(doneCount)/\(items.count)")
                .font(SL.mono(10.5)).foregroundStyle(SL.muted)
        }
    }
}

// MARK: - Check row

private struct CheckRow: View {
    let item: PrepItem
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 11) {
                ZStack {
                    RoundedRectangle(cornerRadius: 7)
                        .fill(item.checked ? SL.accent : .clear)
                        .overlay(
                            RoundedRectangle(cornerRadius: 7)
                                .strokeBorder(item.checked ? .clear : SL.line2, lineWidth: 1.5),
                        )
                    if item.checked {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(SL.onAccent)
                    }
                }
                .frame(width: 22, height: 22)

                Text("\(formatQuantity(item.quantity)) \(item.unit)")
                    .font(SL.mono(12.5, .bold))
                    .foregroundStyle(item.checked ? SL.faint : SL.accent)
                    .frame(width: 50, alignment: .leading)

                Text(item.name)
                    .font(SL.body(13))
                    .strikethrough(item.checked, color: SL.faint)
                    .foregroundStyle(item.checked ? SL.faint : SL.text)
                    .lineLimit(2)

                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
