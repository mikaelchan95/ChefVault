import SwiftUI

/// Compatibility facade for screens that still use the older `SL*` components.
/// The values are intentionally backed by Minimal Kitchen so legacy surfaces pick up
/// the calmer palette and system typography while those screens are migrated over time.
enum SL {
    static let bg = MK.bg
    static let surface = MK.surface
    static let surface2 = MK.surface2
    static let elevated = MK.elevated
    static let text = MK.text
    static let muted = MK.muted
    static let faint = MK.faint
    static let accent = MK.accent
    static let accentHi = MK.accent
    static let onAccent = MK.onAccent
    static let good = MK.good
    static let danger = MK.danger
    static let line = MK.line
    static let line2 = MK.line2
    static let accentSoft = MK.accentSoft

    enum R {
        static let sm = MK.R.sm
        static let md = MK.R.md
        static let lg = MK.R.lg
    }
    enum Pad {
        static let screen = MK.Pad.screen
        static let card = MK.Pad.card
    }

    static func display(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        MK.title(size, weight)
    }
    static func body(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        MK.body(size, weight)
    }
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        MK.mono(size, weight)
    }
}

extension Color {
    init(hex: UInt) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
        )
    }
}

extension UIColor {
    convenience init(hex: UInt) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1,
        )
    }
}

/// Compact label for section headers and metadata.
struct SLKicker: View {
    let text: String
    var color: Color = SL.faint
    var size: CGFloat = 10
    init(_ text: String, color: Color = SL.faint, size: CGFloat = 10) {
        self.text = text; self.color = color; self.size = size
    }
    var body: some View {
        Text(text)
            .font(SL.body(size + 2, .semibold))
            .foregroundStyle(color)
    }
}

/// Neutral app background.
struct SLBackground: View {
    var body: some View {
        MKBackground()
    }
}
