import SwiftUI
import ChefVaultShared

@main
struct ChefVaultApp: App {
    private let sdk: ChefVaultSDK
    @State private var auth: AuthViewModel
    @State private var rc: RevenueCatService

    init() {
        let sdk = AppConfig.makeSDK()
        self.sdk = sdk
        _auth = State(initialValue: AuthViewModel(auth: sdk.auth))
        RevenueCatService.configure(apiKey: AppConfig.revenueCatKey())
        _rc = State(initialValue: RevenueCatService())
    }

    var body: some Scene {
        WindowGroup {
            RootView(auth: auth, sdk: sdk, rc: rc)
                .tint(MK.accent)
                .task { await auth.observe() }
        }
    }
}

/// Routes between the auth flow and the main app based on shared auth state.
struct RootView: View {
    let auth: AuthViewModel
    let sdk: ChefVaultSDK
    let rc: RevenueCatService

    @Environment(\.scenePhase) private var scenePhase
    /// A link shared into the app (Share Extension / paste) awaiting the import sheet.
    @State private var importRequest: ImportRequest?

    /// User appearance override (System / Light / Dark), persisted locally.
    @AppStorage("appearance") private var appearance = "system"
    private var colorSchemeOverride: ColorScheme? {
        switch appearance {
        case "light": return .light
        case "dark": return .dark
        default: return nil // follow the system
        }
    }

    var body: some View {
        Group {
            switch auth.screen {
            case .loading:
                ProgressView().controlSize(.large)
            case .unauthenticated:
                NavigationStack { LoginView(auth: auth) }
            case .authenticated:
                SLTabScaffold(sdk: sdk, auth: auth)
            }
        }
        .preferredColorScheme(colorSchemeOverride)
        .environment(rc)
        .task { await rc.observe() }
        // Bind RevenueCat identity to the Supabase user so the webhook can map
        // app_user_id → profiles.id. Re-runs whenever the signed-in user changes.
        .task(id: auth.userId) {
            if auth.userId.isEmpty {
                await rc.logOut()
            } else {
                await rc.logIn(auth.userId)
            }
        }
        // Share Extension hand-off: chefvault://import?url=… (immediate) + App Group (cold launch).
        .onOpenURL { handleDeepLink($0) }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                checkPendingImport()
                // A webhook may have flipped profiles.plan while we were backgrounded.
                Task { try? await sdk.profile.refresh() }
            }
        }
        // When a purchase grants the entitlement, the RevenueCat → Supabase webhook
        // flips profiles.plan server-side asynchronously. Re-read the profile a few
        // times so the durable gate (which the server cap triggers enforce) catches
        // up without a cold relaunch.
        .onChange(of: rc.isPro) { _, nowPro in
            if nowPro { Task { await reconcileDurableGate() } }
        }
        .sheet(item: $importRequest) { req in
            ImportRecipeView(sdk: sdk, initialUrl: req.url)
        }
    }

    /// After an entitlement change, re-read `profiles.plan` a few times so the
    /// RevenueCat → Supabase webhook (which flips the plan server-side within
    /// seconds) is reflected by the durable gate without a cold relaunch.
    private func reconcileDurableGate() async {
        for delaySeconds in [0, 2, 4, 8] {
            if delaySeconds > 0 {
                try? await Task.sleep(nanoseconds: UInt64(delaySeconds) * 1_000_000_000)
            }
            try? await sdk.profile.refresh()
        }
    }

    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "chefvault", url.host == "import" else { return }
        let param = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "url" })?.value
        let pending = AppGroup.takePendingImport() // always read-and-clear the shared slot
        if let link = (param?.isEmpty == false ? param : pending), !link.isEmpty {
            importRequest = ImportRequest(url: link)
        }
    }

    /// Cold-launch / fallback: the Share Extension wrote the link to the shared container.
    private func checkPendingImport() {
        if let link = AppGroup.takePendingImport(), !link.isEmpty {
            importRequest = ImportRequest(url: link)
        }
    }
}

/// A link awaiting import (wraps a URL string so it can drive a SwiftUI `.sheet(item:)`).
struct ImportRequest: Identifiable {
    let id = UUID()
    let url: String
}

/// Shared App Group container — the durable hand-off between the Share Extension and the app.
enum AppGroup {
    static let suite = "group.com.chefvault.app"
    static let pendingKey = "pendingImportURL"

    /// Read-and-clear the pending import URL from the shared container.
    static func takePendingImport() -> String? {
        let defaults = UserDefaults(suiteName: suite)
        let value = defaults?.string(forKey: pendingKey)
        if value != nil { defaults?.removeObject(forKey: pendingKey) }
        return value
    }
}
