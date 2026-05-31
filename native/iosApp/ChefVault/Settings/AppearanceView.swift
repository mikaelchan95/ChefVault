import SwiftUI

/// Appearance picker — System / Light / Dark. Persists locally via
/// @AppStorage("appearance"); the app root reads the same key and applies it with
/// .preferredColorScheme, so a change re-themes every screen live.
/// Service Line sub-screen: hidden system nav bar, SLSubHeader at top, themed background.
struct AppearanceView: View {
    @AppStorage("appearance") private var appearance = "system"
    @Environment(\.dismiss) private var dismiss

    private let options: [(key: String, title: String, sub: String)] = [
        ("system", "System", "Match device"),
        ("light", "Light", "Always light"),
        ("dark", "Dark", "Always dark"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            SLSubHeader(title: "Appearance", back: "Settings") { dismiss() }
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    SLKicker("Theme").padding(.horizontal, 4)
                    HStack(spacing: 11) {
                        ForEach(options, id: \.key) { card($0) }
                    }
                    Text("Light and Dark override your device setting and persist on this device. Every screen is fully themed either way.")
                        .font(SL.body(12)).foregroundStyle(SL.muted)
                        .padding(.horizontal, 4).padding(.top, 2)
                }
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 18)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
    }

    private func card(_ opt: (key: String, title: String, sub: String)) -> some View {
        let selected = appearance == opt.key
        return Button {
            appearance = opt.key
        } label: {
            VStack(spacing: 8) {
                preview(opt.key)
                HStack(spacing: 4) {
                    Text(opt.title).font(SL.display(13, .bold)).foregroundStyle(SL.text)
                    if selected {
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 12)).foregroundStyle(SL.accent)
                    }
                }
                Text(opt.sub).font(SL.mono(8.5)).tracking(0.3).foregroundStyle(SL.faint)
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity)
            .padding(11)
            .background(SL.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(selected ? SL.accent : SL.line, lineWidth: selected ? 1.5 : 1),
            )
        }
        .buttonStyle(.plain)
    }

    /// A small swatch previewing each theme using the real bg tones
    /// (light #EEEEEC / dark #0C0C0D); System shows a diagonal split.
    @ViewBuilder
    private func preview(_ key: String) -> some View {
        let light = Color(hex: 0xEEEEEC)
        let dark = Color(hex: 0x0C0C0D)
        Group {
            switch key {
            case "light": Rectangle().fill(light)
            case "dark": Rectangle().fill(dark)
            default:
                Rectangle().fill(LinearGradient(
                    stops: [.init(color: light, location: 0.5), .init(color: dark, location: 0.5)],
                    startPoint: .topLeading, endPoint: .bottomTrailing,
                ))
            }
        }
        .frame(height: 52)
        .clipShape(RoundedRectangle(cornerRadius: 9))
        .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(SL.line2, lineWidth: 1))
    }
}
