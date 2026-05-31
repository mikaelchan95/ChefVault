import SwiftUI
import ChefVaultShared

enum SLTab: CaseIterable {
    case recipes, collections, prep, settings
    var label: String { switch self { case .recipes: "Recipes"; case .collections: "Collections"; case .prep: "Prep"; case .settings: "Settings" } }
    var icon: String { switch self { case .recipes: "fork.knife"; case .collections: "square.stack"; case .prep: "checklist"; case .settings: "gearshape" } }
}

/// Service Line tab scaffold — replaces the native TabView. Dark atmosphere behind every
/// tab, a custom bottom bar with an active-pill + dot, and a floating create FAB.
struct SLTabScaffold: View {
    let sdk: ChefVaultSDK
    let auth: AuthViewModel
    @State private var tab: SLTab = .recipes

    var body: some View {
        ZStack(alignment: .bottom) {
            // Each tab paints its own SLBackground so the ember glow isn't doubled.
            Group {
                switch tab {
                case .recipes: RecipeLibraryView(sdk: sdk)
                case .collections: CollectionsView(sdk: sdk)
                case .prep: PrepListsView(sdk: sdk)
                case .settings: SettingsView(sdk: sdk, auth: auth)
                }
            }
            SLTabBar(selection: $tab)
        }
        .task {
            async let r: () = quiet { try await sdk.recipes.refresh() }
            async let c: () = quiet { try await sdk.collections.refresh() }
            async let p: () = quiet { try await sdk.prepLists.refresh() }
            async let pr: () = quiet { try await sdk.profile.refresh() }
            _ = await (r, c, p, pr)
        }
    }
    private func quiet(_ op: () async throws -> Void) async { try? await op() }
}

/// Floating capsule tab bar — a detached pill hovering above the home indicator. The active
/// tab is a filled accent chip that expands to show its label; the rest are icon-only.
struct SLTabBar: View {
    @Binding var selection: SLTab
    var body: some View {
        HStack(spacing: 6) {
            ForEach(SLTab.allCases, id: \.self) { t in
                tab(t)
            }
        }
        .padding(6)
        .background(.ultraThinMaterial, in: Capsule(style: .continuous))
        .background(Capsule(style: .continuous).fill(SL.elevated.opacity(0.6)))
        .overlay(Capsule(style: .continuous).strokeBorder(SL.line2, lineWidth: 1))
        .shadow(color: .black.opacity(0.28), radius: 16, y: 7)
        .padding(.horizontal, SL.Pad.screen)
        .padding(.bottom, 4)
    }

    @ViewBuilder
    private func tab(_ t: SLTab) -> some View {
        let on = t == selection
        HStack(spacing: 7) {
            Image(systemName: t.icon)
                .font(.system(size: 17, weight: .semibold))
            if on {
                Text(t.label)
                    .font(SL.body(13.5, .semibold))
                    .fixedSize()
                    .transition(.opacity.combined(with: .scale(scale: 0.7, anchor: .leading)))
            }
        }
        .foregroundStyle(on ? SL.onAccent : SL.muted)
        .padding(.horizontal, on ? 18 : 0)
        .frame(maxWidth: on ? nil : .infinity)
        .frame(height: 44)
        .background(Capsule(style: .continuous).fill(on ? SL.accent : .clear))
        .contentShape(Capsule())
        .onTapGesture {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.82)) { selection = t }
        }
    }
}

/// Floating create FAB — drop into a tab's bottom-trailing, above the tab bar.
struct SLFab: View {
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: "plus")
                .font(.system(size: 24, weight: .regular))
                .frame(width: 54, height: 54)
                .foregroundStyle(SL.onAccent)
                .background(SL.accent, in: RoundedRectangle(cornerRadius: 18))
                .shadow(color: SL.accent.opacity(0.45), radius: 12, y: 10)
        }
        .buttonStyle(.plain)
        .padding(.trailing, SL.Pad.screen)
        .padding(.bottom, 78)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
    }
}
