import SwiftUI
import ChefVaultShared

/// Owns auth UI state and orchestrates the shared `AuthRepository`. Consumes the
/// Kotlin `Flow<AuthState>` as a Swift `AsyncSequence` and `suspend` functions as
/// `async throws`, both via SKIE.
@MainActor
@Observable
final class AuthViewModel {
    enum Screen { case loading, unauthenticated, authenticated }

    private let auth: AuthRepository

    var screen: Screen = .loading
    var userEmail: String = ""
    var errorMessage: String?
    var isBusy = false

    init(auth: AuthRepository) {
        self.auth = auth
    }

    /// Long-lived observation of the shared auth state. Started from a `.task`.
    func observe() async {
        for await state in auth.authState {
            switch onEnum(of: state) {
            case .loading:
                screen = .loading
            case .notAuthenticated:
                screen = .unauthenticated
            case .authenticated(let authed):
                userEmail = authed.email
                screen = .authenticated
            }
        }
    }

    func signIn(email: String, password: String) async {
        await run { try await self.auth.signIn(email: email, password: password) }
    }

    /// Returns true when email confirmation is required (caller shows the "check email" state).
    func signUp(email: String, password: String, name: String) async -> Bool {
        errorMessage = nil
        isBusy = true
        defer { isBusy = false }
        do {
            let result = try await auth.signUp(email: email, password: password, name: name)
            return result.needsConfirmation
        } catch {
            errorMessage = userMessage(error)
            return false
        }
    }

    func resetPassword(email: String) async {
        await run { try await self.auth.resetPassword(email: email) }
    }

    func signOut() async {
        await run { try await self.auth.signOut() }
    }

    private func run(_ op: @escaping () async throws -> Void) async {
        errorMessage = nil
        isBusy = true
        defer { isBusy = false }
        do {
            try await op()
        } catch {
            errorMessage = userMessage(error)
        }
    }

    private func userMessage(_ error: Error) -> String {
        let message = (error as NSError).localizedDescription
        return message.isEmpty ? "Something went wrong. Please try again." : message
    }
}
