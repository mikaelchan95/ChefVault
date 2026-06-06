import SwiftUI
import ChefVaultShared

enum SLTab: CaseIterable {
    case recipes, collections, prep, settings
    var label: String { switch self { case .recipes: "Recipes"; case .collections: "Collections"; case .prep: "Prep"; case .settings: "Settings" } }
    var icon: String { switch self { case .recipes: "fork.knife"; case .collections: "square.stack"; case .prep: "checklist"; case .settings: "gearshape" } }
}

/// Root tab scaffold with a compact custom bottom bar.
struct SLTabScaffold: View {
    let sdk: ChefVaultSDK
    let auth: AuthViewModel
    @State private var tab: SLTab = .recipes

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch tab {
                case .recipes: RecipeLibraryView(sdk: sdk)
                case .collections: CollectionsView(sdk: sdk)
                case .prep: PrepListsView(sdk: sdk)
                case .settings: SettingsView(sdk: sdk, auth: auth)
                }
            }
            MKTabBar(selection: $tab)
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

/// Legacy tab bar kept for older call sites. New tabs use `MKTabBar`.
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
        .background(Capsule(style: .continuous).fill(SL.surface))
        .overlay(Capsule(style: .continuous).strokeBorder(SL.line2, lineWidth: 1))
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
                    .font(SL.body(13, .semibold))
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
            withAnimation(MK.Motion.smooth) { selection = t }
        }
    }
}

/// Floating create FAB — drop into a tab's bottom-trailing, above the tab bar.
struct SLFab: View {
    var action: () -> Void
    var body: some View { MKFab(action: action) }
}
