import SwiftUI

struct MKSubHeader: View {
    let title: String
    var back: String = "Back"
    var onBack: () -> Void

    var body: some View {
        ZStack {
            Text(title).font(MK.title(16, .semibold)).foregroundStyle(MK.text)
            Button(action: onBack) {
                HStack(spacing: 3) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                    Text(back).font(MK.body(14))
                }
                .foregroundStyle(MK.muted)
            }
            .buttonStyle(MKIconPressStyle())
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, MK.Pad.screen)
        .frame(height: 50)
        .overlay(MKDivider(), alignment: .bottom)
    }
}

struct MKTextField: View {
    let placeholder: String
    @Binding var text: String
    var systemImage: String? = nil
    var secure = false
    var keyboard: UIKeyboardType = .default
    @State private var reveal = false

    var body: some View {
        HStack(spacing: 9) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(MK.faint)
                    .frame(width: 18)
            }
            Group {
                if secure && !reveal {
                    SecureField("", text: $text, prompt: Text(placeholder).foregroundColor(MK.faint))
                } else {
                    TextField("", text: $text, prompt: Text(placeholder).foregroundColor(MK.faint))
                }
            }
            .font(MK.body(15))
            .foregroundStyle(MK.text)
            .keyboardType(keyboard)
            .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
            .autocorrectionDisabled(secure || keyboard == .emailAddress)
            if secure {
                Button { reveal.toggle() } label: {
                    Image(systemName: reveal ? "eye.slash" : "eye").foregroundStyle(MK.faint)
                }
                .buttonStyle(MKIconPressStyle())
            }
        }
        .padding(.horizontal, 13)
        .frame(minHeight: 46)
        .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(MK.line2, lineWidth: 1))
    }
}

struct MKField: View {
    let label: String
    let value: String
    var trailing: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            MKSectionHeader(title: label)
            HStack {
                Text(value.isEmpty ? "-" : value)
                    .font(MK.body(14, value.isEmpty ? .regular : .medium))
                    .foregroundStyle(value.isEmpty ? MK.faint : MK.text)
                Spacer()
                if let trailing {
                    Text(trailing)
                        .font(MK.body(12))
                        .foregroundStyle(MK.faint)
                }
            }
            .padding(.horizontal, 13)
            .frame(height: 44)
            .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(MK.line2, lineWidth: 1))
        }
    }
}

struct MKToggle: View {
    @Binding var isOn: Bool

    var body: some View {
        Button {
            withAnimation(MK.Motion.smooth) { isOn.toggle() }
        } label: {
            RoundedRectangle(cornerRadius: MK.R.pill)
                .fill(isOn ? MK.accent : MK.line2)
                .frame(width: 42, height: 24)
                .overlay(alignment: isOn ? .trailing : .leading) {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 19, height: 19)
                        .shadow(color: .black.opacity(0.15), radius: 1.5, y: 0.5)
                        .padding(2.5)
                }
        }
        .buttonStyle(.plain)
    }
}

struct MKSetGroup<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            MKSectionHeader(title: title).padding(.horizontal, 4)
            VStack(spacing: 0) { content }
                .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.md, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: MK.R.md, style: .continuous).strokeBorder(MK.line, lineWidth: 1))
        }
    }
}

struct MKSetRow<Destination: View>: View {
    let label: String
    var value: String?
    var toggle: Binding<Bool>?
    var destination: (() -> Destination)?

    init(label: String, value: String, @ViewBuilder destination: @escaping () -> Destination) {
        self.label = label
        self.value = value
        self.destination = destination
    }

    var body: some View {
        if let destination {
            NavigationLink {
                destination()
            } label: {
                content { stamp }
            }
            .buttonStyle(.plain)
        } else {
            content { toggle.map { MKToggle(isOn: $0) } }
        }
    }

    private func content<Trailing: View>(@ViewBuilder trailing: () -> Trailing) -> some View {
        HStack(spacing: 10) {
            Text(label).font(MK.body(14)).foregroundStyle(MK.text)
            Spacer(minLength: 0)
            trailing()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .contentShape(Rectangle())
    }

    @ViewBuilder private var stamp: some View {
        let v = value ?? ""
        HStack(spacing: 6) {
            if !v.isEmpty {
                Text(v).font(MK.body(13)).foregroundStyle(MK.muted)
            }
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MK.faint)
        }
    }
}

extension MKSetRow where Destination == EmptyView {
    init(label: String, toggle: Binding<Bool>) {
        self.label = label
        self.value = nil
        self.toggle = toggle
        self.destination = nil
    }
}

struct MKStepper: View {
    @Binding var value: Int
    var range: ClosedRange<Int> = 1...100

    var body: some View {
        HStack(spacing: 0) {
            stepButton("minus") { if value > range.lowerBound { value -= 1 } }
            Text("\(value)")
                .font(MK.mono(16, .bold))
                .foregroundStyle(MK.accent)
                .frame(width: 40, height: 38)
                .overlay(MKDivider().frame(width: 1), alignment: .leading)
                .overlay(MKDivider().frame(width: 1), alignment: .trailing)
            stepButton("plus") { if value < range.upperBound { value += 1 } }
        }
        .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(MK.line2, lineWidth: 1))
    }

    private func stepButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(MK.accent)
                .frame(width: 38, height: 38)
        }
        .buttonStyle(MKIconPressStyle())
    }
}

struct MKSegmented: View {
    @Binding var selection: Int
    let options: [String]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(options.enumerated()), id: \.offset) { index, option in
                Text(option)
                    .font(MK.body(12, .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .foregroundStyle(selection == index ? MK.onAccent : MK.muted)
                    .background(selection == index ? MK.accent : .clear, in: RoundedRectangle(cornerRadius: MK.R.xs, style: .continuous))
                    .contentShape(Rectangle())
                    .onTapGesture {
                        withAnimation(MK.Motion.smooth) { selection = index }
                    }
            }
        }
        .padding(3)
        .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(MK.line, lineWidth: 1))
    }
}
