import SwiftUI

/// Flat card with a hairline outline (brand guidance: strokes over shadows except the CTA).
struct CVCard<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        content
            .padding(CV.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: CV.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: CV.Radius.lg)
                    .strokeBorder(Color(.separator).opacity(0.5), lineWidth: 0.5),
            )
    }
}

/// Uppercased, wide-tracked section label — a brand signature ported from the RN type scale.
struct CVSectionHeader: View {
    let title: String
    var body: some View {
        Text(title.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(0.8)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Selectable pill used for cuisine / filter / color selection.
struct CVChip: View {
    let label: String
    var selected: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline.weight(selected ? .semibold : .regular))
                .padding(.horizontal, CV.Spacing.lg)
                .padding(.vertical, CV.Spacing.sm)
                .background(selected ? CV.primary : Color(.secondarySystemFill), in: Capsule())
                .foregroundStyle(selected ? .white : .primary)
        }
        .buttonStyle(.plain)
    }
}

/// Formats a quantity dropping a trailing ".0" (e.g. 2.0 → "2", 1.5 → "1.5").
func formatQuantity(_ value: Double) -> String {
    if value == value.rounded() && abs(value) < 1e15 {
        return String(Int(value.rounded()))
    }
    return String(format: "%g", value)
}
