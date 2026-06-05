import SwiftUI

// MARK: - Card

/// Flat surface card with a hairline border.
struct SLCard<Content: View>: View {
    var pad: CGFloat = SL.Pad.card
    var soft = false
    @ViewBuilder var content: Content
    var body: some View {
        content
            .padding(pad)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(soft ? SL.surface2 : SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: SL.R.md, style: .continuous).strokeBorder(SL.line, lineWidth: 1))
    }
}

// MARK: - Buttons

enum SLButtonVariant { case primary, secondary, ghost, danger }

struct SLButton: View {
    let title: String
    var variant: SLButtonVariant = .primary
    var icon: String? = nil
    var small = false
    var full = false
    var busy = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                if busy { ProgressView().tint(fg) }
                else {
                    if let icon { Image(systemName: icon).font(.system(size: small ? 12 : 14, weight: .bold)) }
                    Text(title).font(SL.body(small ? 12.5 : 14, .bold))
                }
            }
            .frame(maxWidth: full ? .infinity : nil)
            .frame(minHeight: small ? 36 : 44)
            .padding(.horizontal, small ? 13 : 18)
            .foregroundStyle(fg)
            .background(bg.clipShape(RoundedRectangle(cornerRadius: SL.R.sm, style: .continuous)))
            .overlay(RoundedRectangle(cornerRadius: SL.R.sm, style: .continuous).strokeBorder(border, lineWidth: 1))
        }
        .buttonStyle(MKPressStyle())
        .disabled(busy)
    }

    private var fg: Color {
        switch variant {
        case .primary: SL.onAccent
        case .secondary: SL.text
        case .ghost: SL.muted
        case .danger: SL.danger
        }
    }
    @ViewBuilder private var bg: some View {
        switch variant {
        case .primary: SL.accent
        case .secondary: SL.surface
        case .ghost: Color.clear
        case .danger: SL.danger.opacity(0.12)
        }
    }
    private var border: Color {
        switch variant {
        case .primary: SL.accent
        case .secondary: SL.line2
        case .ghost: .clear
        case .danger: SL.danger.opacity(0.35)
        }
    }
}

// MARK: - Chip

struct SLChip: View {
    let label: String
    var active = false
    var small = true
    var body: some View {
        Text(label)
            .font(SL.body(small ? 11.5 : 12.5, .semibold))
            .padding(.horizontal, small ? 11 : 14)
            .padding(.vertical, small ? 6 : 8)
            .foregroundStyle(active ? SL.onAccent : SL.muted)
            .background(active ? SL.accent : SL.surface, in: Capsule())
            .overlay(Capsule().strokeBorder(active ? SL.accent : SL.line, lineWidth: 1))
    }
}

// MARK: - Icon button

struct SLIconBtn: View {
    let systemName: String
    var accent = false
    var action: () -> Void = {}
    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 15, weight: .semibold))
                .frame(width: 38, height: 38)
                .foregroundStyle(accent ? SL.onAccent : SL.text)
                .background(accent ? SL.accent : SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: SL.R.sm, style: .continuous).strokeBorder(accent ? .clear : SL.line2, lineWidth: 1))
        }
        .buttonStyle(MKIconPressStyle())
    }
}

// MARK: - App bar

struct SLAppBar<Right: View>: View {
    let title: String
    var kicker: String? = nil
    var count: String? = nil
    var sub: String? = nil
    @ViewBuilder var right: Right

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                if let kicker { SLKicker(kicker, color: SL.accent, size: 10.5) }
                HStack(alignment: .firstTextBaseline, spacing: 9) {
                    Text(title).font(SL.display(30, .semibold)).foregroundStyle(SL.text)
                    if let count { Text(count).font(SL.mono(13, .bold)).foregroundStyle(SL.muted) }
                }
                if let sub { Text(sub).font(SL.body(12.5)).foregroundStyle(SL.muted) }
            }
            Spacer(minLength: 0)
            right
        }
        .padding(.horizontal, SL.Pad.screen)
        .padding(.top, 6)
        .padding(.bottom, 14)
    }
}

extension SLAppBar where Right == EmptyView {
    init(title: String, kicker: String? = nil, count: String? = nil, sub: String? = nil) {
        self.init(title: title, kicker: kicker, count: count, sub: sub, right: { EmptyView() })
    }
}

// MARK: - Search bar

struct SLSearchField: View {
    @Binding var text: String
    var placeholder = "Search recipes…"
    var body: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass").font(.system(size: 14)).foregroundStyle(SL.faint)
            TextField("", text: $text, prompt: Text(placeholder).foregroundColor(SL.faint))
                .font(SL.body(14))
                .foregroundStyle(SL.text)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
        }
        .padding(.horizontal, 14)
        .frame(height: 44)
        .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line, lineWidth: 1))
    }
}

// MARK: - Color-hashed tile

struct SLTile: View {
    let letter: String
    var tone: Int = 0
    var size: CGFloat = 56
    var corner: CGFloat = 14
    private static let tones: [[Color]] = [
        [SL.surface2, SL.accentSoft],
        [SL.surface2, SL.elevated],
        [SL.accentSoft, SL.surface],
        [SL.elevated, SL.surface2],
    ]
    var body: some View {
        LinearGradient(colors: Self.tones[tone % 4], startPoint: .topLeading, endPoint: .bottomTrailing)
            .frame(width: size, height: size)
            .overlay(Text(letter).font(SL.display(size * 0.34, .semibold)).foregroundStyle(SL.accent))
            .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: corner, style: .continuous).strokeBorder(SL.line2, lineWidth: 1))
    }
}

// MARK: - Divider

struct SLDivider: View {
    var body: some View { Rectangle().fill(SL.line).frame(height: 1) }
}

// MARK: - Servings stepper + unit segmented

struct SLStepper: View {
    @Binding var value: Int
    var range: ClosedRange<Int> = 1...100
    var body: some View {
        HStack(spacing: 0) {
            stepBtn("minus") { if value > range.lowerBound { value -= 1 } }
            Text("\(value)").font(SL.mono(16, .bold)).foregroundStyle(SL.accent)
                .frame(width: 38, height: 38)
                .overlay(SL.line.frame(width: 1), alignment: .leading)
                .overlay(SL.line.frame(width: 1), alignment: .trailing)
            stepBtn("plus") { if value < range.upperBound { value += 1 } }
        }
        .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm))
        .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line2, lineWidth: 1))
    }
    private func stepBtn(_ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 14, weight: .semibold))
                .foregroundStyle(SL.accent).frame(width: 36, height: 38)
        }
        .buttonStyle(MKIconPressStyle())
    }
}

struct SLSegmented: View {
    @Binding var selection: Int
    let options: [String]
    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(options.enumerated()), id: \.offset) { i, opt in
                Text(opt).font(SL.body(12, .bold))
                    .frame(maxWidth: .infinity).padding(.vertical, 7)
                    .foregroundStyle(selection == i ? SL.onAccent : SL.muted)
                    .background(selection == i ? SL.accent : .clear, in: RoundedRectangle(cornerRadius: 9))
                    .contentShape(Rectangle())
                    .onTapGesture { withAnimation(MK.Motion.fast) { selection = i } }
            }
        }
        .padding(3)
        .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line, lineWidth: 1))
    }
}

// MARK: - Progress bar (prep)

struct SLProgressBar: View {
    let fraction: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(SL.surface2)
                Capsule().fill(SL.accent).frame(width: geo.size.width * max(0, min(1, fraction)))
            }
        }
        .frame(height: 8)
    }
}
