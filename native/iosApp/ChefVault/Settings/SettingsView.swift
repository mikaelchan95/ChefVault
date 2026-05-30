import SwiftUI
import ChefVaultShared

// PLACEHOLDER — replaced by the Settings worker in Phase B batch 2.
struct SettingsView: View {
    let sdk: ChefVaultSDK
    let auth: AuthViewModel
    var body: some View {
        NavigationStack {
            List {
                Button("Sign Out", role: .destructive) { Task { await auth.signOut() } }
            }
            .navigationTitle("Settings")
        }
    }
}
