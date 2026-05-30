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

struct SLTabBar: View {
    @Binding var selection: SLTab
    var body: some View {
        HStack(spacing: 0) {
            ForEach(SLTab.allCases, id: \.self) { t in
                let on = t == selection
                VStack(spacing: 4) {
                    Image(systemName: t.icon)
                        .font(.system(size: 17, weight: .semibold))
                        .frame(width: 38, height: 26)
                        .foregroundStyle(on ? SL.accent : SL.faint)
                        .background(on ? SL.accentSoft : .clear, in: RoundedRectangle(cornerRadius: 9))
                    Text(t.label.uppercased())
                        .font(SL.body(8.5, .bold)).tracking(0.7)
                        .foregroundStyle(on ? SL.accent : SL.faint)
                    Circle().fill(on ? SL.accent : .clear).frame(width: 5, height: 5)
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .onTapGesture { selection = t }
            }
        }
        .padding(.top, 9)
        .padding(.bottom, 6)
        .background(.ultraThinMaterial)
        .overlay(SL.line.frame(height: 1), alignment: .top)
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
