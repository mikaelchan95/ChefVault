import SwiftUI

/// "Service Line" design system — dark-first, monochrome accent, Bricolage Grotesque /
/// Hanken Grotesk / Space Mono. Ported from the hi-fi `hifi-kit.jsx`. Colors resolve
/// per color scheme (dark is the primary, light is a neutral-gray variant); the accent
/// is near-white on dark / near-black on light. Red (danger) and green (good) are the
/// only semantic chroma kept.
enum SL {
    // MARK: Color tokens
    static let bg        = dyn(light: 0xEEEEEC, dark: 0x0C0C0D)
    static let surface   = dyn(light: 0xF9F9F7, dark: 0x151517)
    static let surface2  = dyn(light: 0xEFEFEC, dark: 0x1D1D1F)
    static let elevated  = dyn(light: 0xFFFFFF, dark: 0x272729)
    static let text      = dyn(light: 0x1A1A18, dark: 0xF4F4F2)
    static let muted     = dyn(light: 0x6C6C68, dark: 0x9A9A97)
    static let faint     = dyn(light: 0xA4A4A0, dark: 0x646462)
    // Monochrome accent: near-white on dark, near-black on light (auto-follows theme).
    static let accent    = dyn(light: 0x1A1A18, dark: 0xF2F2EF)
    static let accentHi  = dyn(light: 0x33332F, dark: 0xF6F6F4)   // gradient-top highlight
    static let onAccent  = dyn(light: 0xF7F7F5, dark: 0x111112)
    // Semantic colors — the only chroma kept: green = success/purchase, red = destructive.
    static let good      = dyn(light: 0x2F7D54, dark: 0x3F9B6B)
    static let danger    = dyn(light: 0xC4543F, dark: 0xE0735F)
    /// Hairline borders — white-tint over dark, ink-tint over light.
    static let line  = dynA(light: (0x141412, 0.10), dark: (0xFFFFFF, 0.08))
    static let line2 = dynA(light: (0x141412, 0.17), dark: (0xFFFFFF, 0.15))

    static let accentSoft = accent.opacity(0.15)

    // MARK: Radii / spacing
    enum R { static let sm: CGFloat = 12; static let md: CGFloat = 16; static let lg: CGFloat = 22 }
    enum Pad { static let screen: CGFloat = 18; static let card: CGFloat = 14 }

    // MARK: Type — Bricolage Grotesque (display) / Hanken Grotesk (body) / Space Mono (mono)
    static func display(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        .custom("Bricolage Grotesque", size: size).weight(weight)
    }
    static func body(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Hanken Grotesk", size: size).weight(weight)
    }
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Space Mono", size: size).weight(weight)
    }

    // MARK: Color helpers
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

/// Mono uppercase label with wide tracking — a signature of the design (kickers, metadata).
struct SLKicker: View {
    let text: String
    var color: Color = SL.faint
    var size: CGFloat = 10
    init(_ text: String, color: Color = SL.faint, size: CGFloat = 10) {
        self.text = text; self.color = color; self.size = size
    }
    var body: some View {
        Text(text.uppercased())
            .font(SL.mono(size, .bold))
            .tracking(1)
            .foregroundStyle(color)
    }
}

/// Screen atmosphere: base background + a top ember glow + a faint noise texture.
struct SLBackground: View {
    var body: some View {
        ZStack {
            SL.bg.ignoresSafeArea()
            // top accent glow (radial, fading down)
            RadialGradient(
                colors: [SL.accent.opacity(0.16), .clear],
                center: .top, startRadius: 0, endRadius: 360,
            )
            .frame(maxHeight: 300, alignment: .top)
            .frame(maxHeight: .infinity, alignment: .top)
            .ignoresSafeArea()
            SLNoise().opacity(0.4).ignoresSafeArea().allowsHitTesting(false)
        }
    }
}

/// Subtle procedural grain so flat dark surfaces don't feel plasticky.
private struct SLNoise: View {
    var body: some View {
        Canvas { ctx, size in
            var seed: UInt64 = 0x9E3779B9
            func rand() -> Double { seed = seed &* 6364136223846793005 &+ 1; return Double(seed >> 33) / Double(1 << 31) }
            let step: CGFloat = 3
            var y: CGFloat = 0
            while y < size.height {
                var x: CGFloat = 0
                while x < size.width {
                    let a = rand() * 0.05
                    ctx.fill(Path(CGRect(x: x, y: y, width: step, height: step)), with: .color(.white.opacity(a)))
                    x += step
                }
                y += step
            }
        }
        .blendMode(.overlay)
    }
}
