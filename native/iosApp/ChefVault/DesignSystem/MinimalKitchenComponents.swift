import SwiftUI

struct MKCard<Content: View>: View {
    var pad: CGFloat = MK.Pad.card
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(pad)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.md, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: MK.R.md, style: .continuous).strokeBorder(MK.line, lineWidth: 1))
    }
}

enum MKButtonVariant { case primary, secondary, quiet, danger }

struct MKButton: View {
    let title: String
    var variant: MKButtonVariant = .primary
    var icon: String? = nil
    var small = false
    var full = false
    var busy = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if busy {
                    ProgressView().tint(foreground)
                } else {
                    if let icon {
                        Image(systemName: icon)
                            .font(.system(size: small ? 13 : 15, weight: .semibold))
                    }
                    Text(title).font(MK.body(small ? 13 : 15, .semibold))
                }
            }
            .frame(maxWidth: full ? .infinity : nil)
            .frame(minHeight: small ? 36 : 44)
            .padding(.horizontal, small ? 13 : 16)
            .foregroundStyle(foreground)
            .background {
                background.clipShape(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
            }
            .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(border, lineWidth: 1))
        }
        .buttonStyle(MKPressStyle())
        .disabled(busy)
    }

    private var foreground: Color {
        switch variant {
        case .primary: MK.onAccent
        case .secondary: MK.text
        case .quiet: MK.muted
        case .danger: MK.danger
        }
    }

    private var border: Color {
        switch variant {
        case .primary: MK.accent
        case .secondary: MK.line
        case .quiet: .clear
        case .danger: MK.danger.opacity(0.35)
        }
    }

    @ViewBuilder private var background: some View {
        switch variant {
        case .primary: MK.accent
        case .secondary: MK.surface
        case .quiet: Color.clear
        case .danger: MK.danger.opacity(0.12)
        }
    }
}

struct MKIconButton: View {
    let systemName: String
    var accent = false
    var label: String? = nil
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                Image(systemName: systemName)
                    .font(.system(size: 15, weight: .semibold))
                if let label {
                    Text(label).font(MK.body(13, .semibold))
                }
            }
            .frame(minWidth: label == nil ? 40 : nil, minHeight: 40)
            .padding(.horizontal, label == nil ? 0 : 12)
            .foregroundStyle(accent ? MK.onAccent : MK.text)
            .background(accent ? MK.accent : MK.surface, in: RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(accent ? .clear : MK.line, lineWidth: 1))
        }
        .buttonStyle(MKIconPressStyle())
        .accessibilityLabel(label ?? systemName)
    }
}

struct MKChip: View {
    let label: String
    var active = false
    var small = true

    var body: some View {
        Text(label)
            .font(MK.body(small ? 12 : 13, .semibold))
            .padding(.horizontal, small ? 11 : 14)
            .padding(.vertical, small ? 7 : 9)
            .foregroundStyle(active ? MK.onAccent : MK.muted)
            .background(active ? MK.accent : MK.surface, in: Capsule())
            .overlay(Capsule().strokeBorder(active ? MK.accent : MK.line, lineWidth: 1))
    }
}

struct MKAppBar<Right: View>: View {
    let title: String
    var kicker: String? = nil
    var count: String? = nil
    var sub: String? = nil
    @ViewBuilder var right: Right

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                if let kicker {
                    Text(kicker)
                        .font(MK.body(12, .semibold))
                        .foregroundStyle(MK.accent)
                }
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(title)
                        .font(MK.title(30, .semibold))
                        .foregroundStyle(MK.text)
                    if let count {
                        Text(count)
                            .font(MK.mono(13, .bold))
                            .foregroundStyle(MK.muted)
                    }
                }
                if let sub {
                    Text(sub)
                        .font(MK.body(13))
                        .foregroundStyle(MK.muted)
                }
            }
            Spacer(minLength: 0)
            right
        }
        .padding(.horizontal, MK.Pad.screen)
        .padding(.top, 6)
        .padding(.bottom, 14)
    }
}

extension MKAppBar where Right == EmptyView {
    init(title: String, kicker: String? = nil, count: String? = nil, sub: String? = nil) {
        self.init(title: title, kicker: kicker, count: count, sub: sub, right: { EmptyView() })
    }
}

struct MKSearchField: View {
    @Binding var text: String
    var placeholder = "Search recipes..."

    var body: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(MK.faint)
            TextField("", text: $text, prompt: Text(placeholder).foregroundColor(MK.faint))
                .font(MK.body(14))
                .foregroundStyle(MK.text)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
            if !text.isEmpty {
                Button { text = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(MK.faint)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .frame(height: 44)
        .background(MK.surface, in: RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: MK.R.sm, style: .continuous).strokeBorder(MK.line, lineWidth: 1))
    }
}

struct MKTile: View {
    let letter: String
    var tone: Int = 0
    var size: CGFloat = 56
    var corner: CGFloat = 14

    private static let tones: [[Color]] = [
        [MK.surface2, MK.accentSoft],
        [MK.surface2, MK.elevated],
        [MK.accentSoft, MK.surface],
        [MK.elevated, MK.surface2],
    ]

    var body: some View {
        LinearGradient(colors: Self.tones[tone % Self.tones.count], startPoint: .topLeading, endPoint: .bottomTrailing)
            .frame(width: size, height: size)
            .overlay(Text(letter).font(MK.title(size * 0.34, .semibold)).foregroundStyle(MK.accent))
            .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: corner, style: .continuous).strokeBorder(MK.line, lineWidth: 1))
    }
}

struct MKEmptyState: View {
    let systemName: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: systemName)
                .font(.system(size: 27, weight: .semibold))
                .foregroundStyle(MK.accent)
                .frame(width: 70, height: 70)
                .background(MK.accentSoft, in: RoundedRectangle(cornerRadius: MK.R.lg, style: .continuous))
            Text(title).font(MK.title(19, .semibold)).foregroundStyle(MK.text)
            Text(message)
                .font(MK.body(13))
                .foregroundStyle(MK.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
    }
}

enum MKPrimaryAction: String, Identifiable, CaseIterable {
    case newRecipe
    case talkRecipe
    case importLink

    var id: String { rawValue }
    var label: String {
        switch self {
        case .newRecipe: "New Recipe"
        case .talkRecipe: "Talk Recipe"
        case .importLink: "Import Link"
        }
    }
    var icon: String {
        switch self {
        case .newRecipe: "square.and.pencil"
        case .talkRecipe: "waveform"
        case .importLink: "link"
        }
    }
}

struct MKCreateActionMenu: View {
    @Binding var selection: MKPrimaryAction?

    var body: some View {
        Menu {
            ForEach(MKPrimaryAction.allCases) { action in
                Button { selection = action } label: {
                    Label(action.label, systemImage: action.icon)
                }
            }
        } label: {
            Label("Create", systemImage: "plus")
                .font(MK.body(14, .semibold))
                .foregroundStyle(MK.onAccent)
                .frame(minHeight: 40)
                .padding(.horizontal, 14)
                .background(MK.accent, in: Capsule())
        }
        .buttonStyle(MKPressStyle())
    }
}

struct MKDivider: View {
    var body: some View {
        Rectangle().fill(MK.line).frame(height: 1)
    }
}

struct MKProgressBar: View {
    let fraction: Double

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(MK.surface2)
                Capsule()
                    .fill(MK.accent)
                    .frame(width: geo.size.width * max(0, min(1, fraction)))
            }
        }
        .frame(height: 8)
    }
}

struct MKTabBar: View {
    @Binding var selection: SLTab

    var body: some View {
        HStack(spacing: 4) {
            ForEach(SLTab.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .padding(5)
        .background(MK.surface, in: Capsule())
        .overlay(Capsule().strokeBorder(MK.line2, lineWidth: 1))
        .padding(.horizontal, MK.Pad.screen)
        .padding(.bottom, 4)
    }

    private func tabButton(_ tab: SLTab) -> some View {
        let isSelected = tab == selection
        return Button {
            withAnimation(MK.Motion.smooth) { selection = tab }
        } label: {
            HStack(spacing: 7) {
                Image(systemName: tab.icon)
                    .font(.system(size: 16, weight: .semibold))
                if isSelected {
                    Text(tab.label)
                        .font(MK.body(13, .semibold))
                        .transition(.opacity.combined(with: .scale(scale: 0.8, anchor: .leading)))
                }
            }
            .foregroundStyle(isSelected ? MK.onAccent : MK.muted)
            .frame(maxWidth: isSelected ? nil : .infinity)
            .frame(height: 42)
            .padding(.horizontal, isSelected ? 16 : 0)
            .background(isSelected ? MK.accent : .clear, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.label)
    }
}

struct MKFab: View {
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .semibold))
                .frame(width: 54, height: 54)
                .foregroundStyle(MK.onAccent)
                .background(MK.accent, in: RoundedRectangle(cornerRadius: MK.R.lg, style: .continuous))
        }
        .buttonStyle(MKPressStyle())
        .padding(.trailing, MK.Pad.screen)
        .padding(.bottom, 78)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
    }
}
