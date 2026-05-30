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
                    VStack(alignment: .leading, spacing: 8) {
                        SLKicker("Cover")
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 9) {
                                ForEach(collectionPresetHexes, id: \.self) { hex in
                                    ColorSwatch(hex: hex, selected: colorHex == hex) {
                                        colorHex = hex
                                    }
                                }
                            }
                            .padding(.vertical, 2)
                        }
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        SLKicker("Preview")
                        CollectionPreviewCard(name: trimmedName.isEmpty ? "Collection name" : trimmedName,
                                              colorHex: colorHex, status: status)
                    }
                    if let errorMessage {
                        Text(errorMessage).font(SL.body(12.5)).foregroundStyle(SL.danger)
                    }
                    SLButton(title: "Create Collection", icon: "checkmark", full: true, busy: saving) {
                        Task { await create() }
                    }
                    .disabled(trimmedName.isEmpty || saving)
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
            Text("New Collection").font(SL.display(16, .bold)).foregroundStyle(SL.text)
            Button("Cancel") { dismiss() }
                .font(SL.body(14.5))
                .foregroundStyle(SL.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, SL.Pad.screen)
        .frame(height: 52)
        .overlay(SL.line.frame(height: 1), alignment: .bottom)
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

/// Tappable color tile with an accent ring + checkmark when selected.
struct ColorSwatch: View {
    let hex: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            RoundedRectangle(cornerRadius: 12)
                .fill(colorFromHex(hex) ?? SL.accent)
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .opacity(selected ? 1 : 0),
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(selected ? SL.accent : SL.line2, lineWidth: selected ? 2 : 1),
                )
        }
        .buttonStyle(.plain)
    }
}

/// Compact hero preview mirroring the collection detail hero look.
struct CollectionPreviewCard: View {
    let name: String
    let colorHex: String
    let status: CollectionStatus

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            (colorFromHex(colorHex) ?? SL.accent)
                .frame(height: 96)
                .frame(maxWidth: .infinity)
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: "square.stack")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.7))
                HStack(alignment: .firstTextBaseline) {
                    Text(name).font(SL.display(18, .heavy)).tracking(-0.4).foregroundStyle(.white).lineLimit(1)
                    Spacer(minLength: 8)
                    SLCollectionStatusPill(status: status)
                }
            }
            .padding(SL.Pad.card)
        }
        .clipShape(RoundedRectangle(cornerRadius: SL.R.md))
        .overlay(RoundedRectangle(cornerRadius: SL.R.md).strokeBorder(SL.line, lineWidth: 1))
    }
}
