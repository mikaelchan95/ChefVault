import AuthenticationServices
import CryptoKit
import SwiftUI

/// Social sign-in block: Sign in with Apple first (HIG), then Google via web auth.
struct SocialSignInButtons: View {
    let auth: AuthViewModel
    @State private var currentNonce: String?
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 9) {
            HStack(spacing: 11) {
                SLDivider()
                SLKicker("or")
                SLDivider()
            }
            .padding(.vertical, 9)

            SignInWithAppleButton(.signIn) { request in
                let nonce = randomNonceString()
                currentNonce = nonce
                request.requestedScopes = [.fullName, .email]
                request.nonce = sha256(nonce)
            } onCompletion: { result in
                guard case let .success(authResults) = result,
                      let credential = authResults.credential as? ASAuthorizationAppleIDCredential,
                      let tokenData = credential.identityToken,
                      let idToken = String(data: tokenData, encoding: .utf8),
                      let nonce = currentNonce else { return }
                Task { await auth.signInWithApple(idToken: idToken, nonce: nonce) }
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: 46)
            .clipShape(RoundedRectangle(cornerRadius: SL.R.sm))
            .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line2, lineWidth: 1))

            SLButton(title: "Continue with Google", variant: .secondary, icon: "globe", full: true) {
                Task { await auth.signInWithGoogle() }
            }
        }
    }
}

// MARK: - Web auth (Google) via ASWebAuthenticationSession

/// Presents the provider's hosted page and returns the `chefvault://` callback URL.
@MainActor
func startWebAuth(url: URL, callbackScheme: String) async throws -> URL {
    let presenter = WebAuthPresenter()
    return try await withCheckedThrowingContinuation { continuation in
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { callback, error in
            if let callback {
                continuation.resume(returning: callback)
            } else {
                continuation.resume(throwing: error ?? URLError(.userCancelledAuthentication))
            }
        }
        session.presentationContextProvider = presenter
        objc_setAssociatedObject(session, &WebAuthPresenter.key, presenter, .OBJC_ASSOCIATION_RETAIN)
        session.start()
    }
}

private final class WebAuthPresenter: NSObject, ASWebAuthenticationPresentationContextProviding {
    nonisolated(unsafe) static var key: UInt8 = 0
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
        return scene?.keyWindow ?? ASPresentationAnchor()
    }
}

// MARK: - Nonce helpers (Sign in with Apple ↔ Supabase)

private func randomNonceString(length: Int = 32) -> String {
    let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    var result = ""
    var remaining = length
    while remaining > 0 {
        var random: UInt8 = 0
        _ = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
        if random < charset.count {
            result.append(charset[Int(random)])
            remaining -= 1
        }
    }
    return result
}

private func sha256(_ input: String) -> String {
    SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
}
