import SwiftUI
import ChefVaultShared

@main
struct ChefVaultApp: App {
    private let sdk: ChefVaultSDK
    @State private var auth: AuthViewModel

    init() {
        let sdk = AppConfig.makeSDK()
        self.sdk = sdk
        _auth = State(initialValue: AuthViewModel(auth: sdk.auth))
    }

    var body: some Scene {
        WindowGroup {
            RootView(auth: auth, sdk: sdk)
                .tint(CV.primary)
                .task { await auth.observe() }
        }
    }
}

/// Routes between the auth flow and the main app based on shared auth state.
struct RootView: View {
    let auth: AuthViewModel
    let sdk: ChefVaultSDK

    var body: some View {
        switch auth.screen {
        case .loading:
            ProgressView().controlSize(.large)
        case .unauthenticated:
            NavigationStack { LoginView(auth: auth) }
        case .authenticated:
            RecipeLibraryView(sdk: sdk, auth: auth)
        }
    }
}
