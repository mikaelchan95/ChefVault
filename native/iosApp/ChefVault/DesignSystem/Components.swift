import SwiftUI

/// 3-segment password strength meter (weak / fair / strong).
struct PasswordStrengthBar: View {
    let password: String

    private var score: Int {
        guard !password.isEmpty else { return 0 }
        var s = 0
        if password.count >= 8 { s += 1 }
        let hasUpper = password.range(of: "[A-Z]", options: .regularExpression) != nil
        let hasLower = password.range(of: "[a-z]", options: .regularExpression) != nil
        if hasUpper && hasLower { s += 1 }
        if password.range(of: "[0-9]", options: .regularExpression) != nil { s += 1 }
        return s
    }

    private var label: String { score <= 1 ? "Weak" : (score == 2 ? "Fair" : "Strong") }
    private var color: Color { score <= 1 ? .red : (score == 2 ? .orange : .green) }

    var body: some View {
        if !password.isEmpty {
            HStack(spacing: CV.Spacing.sm) {
                ForEach(0..<3, id: \.self) { index in
                    Capsule()
                        .fill(index < score ? color : Color(.tertiarySystemFill))
                        .frame(height: 4)
                }
                Text(label).font(.caption).foregroundStyle(color)
            }
        }
    }
}
