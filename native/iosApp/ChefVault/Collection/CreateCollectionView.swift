import SwiftUI
import ChefVaultShared

struct CreateCollectionView: View {
    let sdk: ChefVaultSDK
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var status: CollectionStatus = .active
    @State private var colorHex = collectionPresetHexes[0]
    @State private var saving = false
    @State private var errorMessage: String?

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

                Section("Color") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: CV.Spacing.md) {
                            ForEach(collectionPresetHexes, id: \.self) { hex in
                                ColorSwatch(hex: hex, selected: colorHex == hex) {
                                    colorHex = hex
                                }
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }

                Section("Preview") {
                    CollectionPreviewCard(name: trimmedName.isEmpty ? "Collection name" : trimmedName,
                                          colorHex: colorHex, status: status)
                }

                if let errorMessage { Text(errorMessage).foregroundStyle(.red).font(.footnote) }
            }
            .navigationTitle("New Collection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await create() } }
                        .disabled(trimmedName.isEmpty || saving)
                }
            }
        }
    }

    private func create() async {
        saving = true
        errorMessage = nil
        defer { saving = false }
        let form = NewCollection(
            name: trimmedName,
            description: description.isEmpty ? nil : description,
            color: colorHex,
            icon: nil,
            status: status,
        )
        do {
            _ = try await sdk.collections.create(form: form)
            dismiss()
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

/// Tappable color circle with a checkmark when selected.
struct ColorSwatch: View {
    let hex: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Circle()
                .fill(colorFromHex(hex) ?? CV.primary)
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: "checkmark")
                        .font(.subheadline.bold())
                        .foregroundStyle(.white)
                        .opacity(selected ? 1 : 0),
                )
                .overlay(
                    Circle().strokeBorder(.white, lineWidth: selected ? 2 : 0),
                )
        }
        .buttonStyle(.plain)
    }
}

/// Compact hero preview mirroring the grid card's look.
struct CollectionPreviewCard: View {
    let name: String
    let colorHex: String
    let status: CollectionStatus

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                (colorFromHex(colorHex) ?? CV.primary)
                    .frame(height: 72)
                    .frame(maxWidth: .infinity)
                Image(systemName: "square.stack")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(CV.Spacing.md)
            }
            HStack {
                Text(name).font(.headline).lineLimit(1)
                Spacer()
                CollectionStatusBadge(status: status)
            }
            .padding(CV.Spacing.md)
        }
        .clipShape(RoundedRectangle(cornerRadius: CV.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: CV.Radius.lg)
                .strokeBorder(Color(.separator).opacity(0.5), lineWidth: 0.5),
        )
        .listRowInsets(EdgeInsets())
    }
}
