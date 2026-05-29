import SwiftUI

/// Brand text field with leading icon and optional secure-entry reveal toggle.
struct CVTextField: View {
    let title: String
    @Binding var text: String
    var systemImage: String
    var isSecure = false
    var keyboard: UIKeyboardType = .default
    @State private var reveal = false

    var body: some View {
        HStack(spacing: CV.Spacing.sm) {
            Image(systemName: systemImage)
                .foregroundStyle(.secondary)
                .frame(width: 20)
            Group {
                if isSecure && !reveal {
                    SecureField(title, text: $text)
                } else {
                    TextField(title, text: $text)
                }
            }
            .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
            .autocorrectionDisabled(isSecure || keyboard == .emailAddress)
            .keyboardType(keyboard)
            if isSecure {
                Button { reveal.toggle() } label: {
                    Image(systemName: reveal ? "eye.slash" : "eye").foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(CV.Spacing.lg)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: CV.Radius.lg))
    }
}

/// Full-width brand primary button with a busy state.
struct CVPrimaryButton: View {
    let title: String
    var busy = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                if busy { ProgressView().tint(.white) } else { Text(title).fontWeight(.bold) }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, CV.Spacing.lg)
            .background(CV.primary, in: RoundedRectangle(cornerRadius: CV.Radius.lg))
            .foregroundStyle(.white)
        }
        .disabled(busy)
    }
}

/// Inline error label shown under forms.
struct CVErrorLabel: View {
    let message: String?
    var body: some View {
        if let message {
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .font(.footnote)
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

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
