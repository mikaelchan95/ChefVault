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
            if phase == .active { checkPendingImport() }
        }
        .sheet(item: $importRequest) { req in
            ImportRecipeView(sdk: sdk, initialUrl: req.url)
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
