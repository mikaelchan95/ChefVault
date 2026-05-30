import SwiftUI

/// Sub-screen nav bar: "‹ <back>" leading + centered title (settings sub-screens, etc.).
struct SLSubHeader: View {
    let title: String
    var back: String = "Settings"
    var onBack: () -> Void
    var body: some View {
        ZStack {
            Text(title).font(SL.display(16, .bold)).foregroundStyle(SL.text)
            Button(action: onBack) {
                HStack(spacing: 2) {
                    Image(systemName: "chevron.left").font(.system(size: 15, weight: .semibold))
                    Text(back).font(SL.body(14.5))
                }
                .foregroundStyle(SL.muted)
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 16)
        .frame(height: 48)
        .overlay(SL.line.frame(height: 1), alignment: .bottom)
    }
}

/// Brand text field — leading icon, optional secure reveal, bordered surface.
struct SLTextField: View {
    let placeholder: String
    @Binding var text: String
    var systemImage: String? = nil
    var secure = false
    var keyboard: UIKeyboardType = .default
    @State private var reveal = false

    var body: some View {
        HStack(spacing: 9) {
            if let systemImage {
                Image(systemName: systemImage).font(.system(size: 14)).foregroundStyle(SL.faint).frame(width: 18)
            }
            Group {
                if secure && !reveal {
                    SecureField("", text: $text, prompt: Text(placeholder).foregroundColor(SL.faint))
                } else {
                    TextField("", text: $text, prompt: Text(placeholder).foregroundColor(SL.faint))
                }
            }
            .font(SL.body(15))
            .foregroundStyle(SL.text)
            .keyboardType(keyboard)
            .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
            .autocorrectionDisabled(secure || keyboard == .emailAddress)
            if secure {
                Button { reveal.toggle() } label: {
                    Image(systemName: reveal ? "eye.slash" : "eye").foregroundStyle(SL.faint)
                }.buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 13)
        .frame(height: 46)
        .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm))
        .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line2, lineWidth: 1))
    }
}

/// Read-only labeled field (e.g. disabled email): label kicker + value.
struct SLField: View {
    let label: String
    let value: String
    var trailing: String? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            SLKicker(label)
            HStack {
                Text(value.isEmpty ? "—" : value).font(SL.body(14, value.isEmpty ? .regular : .medium))
                    .foregroundStyle(value.isEmpty ? SL.faint : SL.text)
                Spacer()
                if let trailing { Text(trailing).font(SL.body(12.5)).foregroundStyle(SL.faint) }
            }
            .padding(.horizontal, 13).frame(height: 44)
            .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm))
            .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line2, lineWidth: 1))
        }
    }
}

/// Rounded accent toggle (matches the hi-fi SetRow switch).
struct SLToggle: View {
    @Binding var isOn: Bool
    var body: some View {
        Button { isOn.toggle() } label: {
            RoundedRectangle(cornerRadius: 23)
                .fill(isOn ? SL.accent : SL.line2)
                .frame(width: 40, height: 23)
                .overlay(Circle().fill(.white).frame(width: 18, height: 18).padding(2.5),
                         alignment: isOn ? .trailing : .leading)
                .animation(.easeInOut(duration: 0.18), value: isOn)
        }
        .buttonStyle(.plain)
    }
}

/// Grouped settings card + row (shared by settings sub-screens).
struct SLSetGroup<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            SLKicker(title).padding(.horizontal, 4)
            VStack(spacing: 0) { content }
                .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md))
                .overlay(RoundedRectangle(cornerRadius: SL.R.md).strokeBorder(SL.line, lineWidth: 1))
        }
    }
}
