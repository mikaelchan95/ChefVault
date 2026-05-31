import SwiftUI

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

/// Formats a quantity dropping a trailing ".0" (e.g. 2.0 → "2", 1.5 → "1.5").
func formatQuantity(_ value: Double) -> String {
    if value == value.rounded() && abs(value) < 1e15 {
        return String(Int(value.rounded()))
    }
    return String(format: "%g", value)
}
