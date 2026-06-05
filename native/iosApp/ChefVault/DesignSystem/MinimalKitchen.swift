import SwiftUI

enum MK {
    static let bg = dyn(light: 0xF7F8F6, dark: 0x101412)
    static let surface = dyn(light: 0xFFFFFF, dark: 0x171D1A)
    static let surface2 = dyn(light: 0xEEF2EF, dark: 0x202824)
    static let elevated = dyn(light: 0xFAFBFA, dark: 0x29312D)
    static let text = dyn(light: 0x17201D, dark: 0xF4F7F3)
    static let muted = dyn(light: 0x65706B, dark: 0xA7B0AA)
    static let faint = dyn(light: 0x9AA39E, dark: 0x737D77)
    static let accent = dyn(light: 0x2F7D73, dark: 0x78C7BA)
    static let onAccent = dyn(light: 0xFFFFFF, dark: 0x0F1714)
    static let good = dyn(light: 0x2F7D54, dark: 0x70C08F)
    static let danger = dyn(light: 0xC4543F, dark: 0xE0735F)
    static let line = dynA(light: (0xDDE4DF, 1), dark: (0xFFFFFF, 0.10))
    static let line2 = dynA(light: (0xC8D2CC, 1), dark: (0xFFFFFF, 0.16))
    static let accentSoft = accent.opacity(0.14)

    enum R {
        static let xs: CGFloat = 8
        static let sm: CGFloat = 10
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let pill: CGFloat = 999
    }

    enum Pad {
        static let screen: CGFloat = 18
        static let card: CGFloat = 14
        static let row: CGFloat = 13
    }

    enum Motion {
        static let fast = Animation.easeOut(duration: 0.16)
        static let smooth = Animation.spring(response: 0.32, dampingFraction: 0.84)
        static let gentle = Animation.spring(response: 0.42, dampingFraction: 0.88)
    }

    static func title(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    static func body(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Space Mono", size: size).weight(weight)
    }

    static func dyn(light: UInt, dark: UInt) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) })
    }

    static func dynA(light: (UInt, CGFloat), dark: (UInt, CGFloat)) -> Color {
        Color(uiColor: UIColor {
            $0.userInterfaceStyle == .dark
                ? UIColor(hex: dark.0).withAlphaComponent(dark.1)
                : UIColor(hex: light.0).withAlphaComponent(light.1)
        })
    }
}

struct MKBackground: View {
    var body: some View {
        MK.bg.ignoresSafeArea()
    }
}

struct MKSectionHeader: View {
    let title: String
    var body: some View {
        Text(title)
            .font(MK.body(12, .semibold))
            .foregroundStyle(MK.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
