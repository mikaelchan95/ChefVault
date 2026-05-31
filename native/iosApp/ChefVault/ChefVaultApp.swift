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
                .tint(SL.accent)
                .task { await auth.observe() }
        }
    }
}

/// Routes between the auth flow and the main app based on shared auth state.
struct RootView: View {
    let auth: AuthViewModel
    let sdk: ChefVaultSDK
    let rc: RevenueCatService

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
    }
}
