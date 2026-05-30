import SwiftUI
import ChefVaultShared

/// Root of the authenticated app — 4 native tabs, each owning its own NavigationStack.
struct MainTabView: View {
    let sdk: ChefVaultSDK
    let auth: AuthViewModel

    var body: some View {
        TabView {
            RecipeLibraryView(sdk: sdk)
                .tabItem { Label("Recipes", systemImage: "fork.knife") }
            CollectionsView(sdk: sdk)
                .tabItem { Label("Collections", systemImage: "square.stack") }
            PrepListsView(sdk: sdk)
                .tabItem { Label("Prep", systemImage: "checklist") }
            SettingsView(sdk: sdk, auth: auth)
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .task {
            // Warm the shared caches once the tabs appear.
            async let r: () = refreshQuietly { try await sdk.recipes.refresh() }
            async let c: () = refreshQuietly { try await sdk.collections.refresh() }
            async let p: () = refreshQuietly { try await sdk.prepLists.refresh() }
            async let pr: () = refreshQuietly { try await sdk.profile.refresh() }
            _ = await (r, c, p, pr)
        }
    }
}

private func refreshQuietly(_ op: () async throws -> Void) async {
    try? await op()
}
