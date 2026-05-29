import SwiftUI
import ChefVaultShared

/// Placeholder authenticated screen for the Auth slice (P5). Replaced by the Recipe
/// Library tab UI in P6.
struct HomeView: View {
    let auth: AuthViewModel
    let sdk: ChefVaultSDK

    var body: some View {
        NavigationStack {
            VStack(spacing: CV.Spacing.lg) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(CV.primary)
                Text("Signed in").font(.title2.bold())
                Text(auth.userEmail).foregroundStyle(.secondary)

                Button(role: .destructive) {
                    Task { await auth.signOut() }
                } label: {
                    Text("Sign Out").fontWeight(.semibold)
                }
                .padding(.top, CV.Spacing.md)
            }
            .padding(CV.Spacing.xl)
            .navigationTitle("ChefVault")
        }
    }
}
