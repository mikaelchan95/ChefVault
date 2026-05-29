import SwiftUI

struct SignUpView: View {
    let auth: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmationSent = false

    var body: some View {
        ScrollView {
            if confirmationSent {
                confirmationState
            } else {
                form
            }
        }
        .navigationTitle("Sign Up")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var form: some View {
        VStack(spacing: CV.Spacing.lg) {
            Text("Create Account")
                .font(.title.bold())
                .frame(maxWidth: .infinity, alignment: .leading)

            CVTextField(title: "Full name", text: $name, systemImage: "person")
            CVTextField(title: "Email address", text: $email, systemImage: "envelope", keyboard: .emailAddress)
            CVTextField(title: "Password", text: $password, systemImage: "lock", isSecure: true)
            PasswordStrengthBar(password: password)

            CVErrorLabel(message: auth.errorMessage)

            CVPrimaryButton(title: "Sign Up", busy: auth.isBusy) {
                Task {
                    let needsConfirmation = await auth.signUp(email: email, password: password, name: name)
                    if needsConfirmation { confirmationSent = true }
                    // Otherwise the auth-state flow flips to authenticated and the root view swaps.
                }
            }
        }
        .padding(CV.Spacing.xl)
    }

    private var confirmationState: some View {
        VStack(spacing: CV.Spacing.lg) {
            Image(systemName: "envelope.badge")
                .font(.system(size: 56))
                .foregroundStyle(CV.primary)
            Text("Check your email").font(.title2.bold())
            Text("We sent a confirmation link to \(email). Confirm it, then sign in.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            CVPrimaryButton(title: "Back to Sign In") { dismiss() }
        }
        .padding(CV.Spacing.xl)
        .padding(.top, CV.Spacing.xxxl)
    }
}
