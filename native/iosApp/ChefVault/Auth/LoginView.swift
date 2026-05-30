import SwiftUI

struct LoginView: View {
    let auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ScrollView {
            VStack(spacing: CV.Spacing.lg) {
                VStack(spacing: CV.Spacing.xs) {
                    Text("ChefVault")
                        .font(.largeTitle.bold())
                        .foregroundStyle(CV.primary)
                    Text("Professional Recipe Management")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, CV.Spacing.xxxl)
                .padding(.bottom, CV.Spacing.lg)

                CVTextField(title: "Email address", text: $email, systemImage: "envelope", keyboard: .emailAddress)
                CVTextField(title: "Password", text: $password, systemImage: "lock", isSecure: true)

                CVErrorLabel(message: auth.errorMessage)

                CVPrimaryButton(title: "Sign In", busy: auth.isBusy) {
                    Task { await auth.signIn(email: email, password: password) }
                }

                SocialSignInButtons(auth: auth)

                NavigationLink("Forgot Password?") { ForgotPasswordView(auth: auth) }
                    .font(.subheadline)
                    .tint(CV.primary)
                    .frame(maxWidth: .infinity, alignment: .trailing)

                HStack(spacing: CV.Spacing.xs) {
                    Text("Don't have an account?").foregroundStyle(.secondary)
                    NavigationLink("Sign Up") { SignUpView(auth: auth) }
                        .tint(CV.primary)
                        .fontWeight(.semibold)
                }
                .font(.subheadline)
                .padding(.top, CV.Spacing.md)
            }
            .padding(CV.Spacing.xl)
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}
