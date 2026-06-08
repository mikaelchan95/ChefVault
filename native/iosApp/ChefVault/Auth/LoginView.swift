import SwiftUI

struct LoginView: View {
    let auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 13) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("ChefVault")
                        .font(SL.display(36, .semibold))
                        .foregroundStyle(SL.text)
                    Text("Your kitchen, organized.")
                        .font(SL.body(13.5))
                        .foregroundStyle(SL.muted)
                }
                .padding(.bottom, 13)

                SLTextField(placeholder: "chef@restaurant.com", text: $email,
                            systemImage: "envelope", keyboard: .emailAddress)
                SLTextField(placeholder: "Password", text: $password,
                            systemImage: "lock", secure: true)

                NavigationLink { ForgotPasswordView(auth: auth) } label: {
                    Text("Forgot password?")
                        .font(SL.body(12.5))
                        .foregroundStyle(SL.muted)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .buttonStyle(.plain)

                if let message = auth.errorMessage {
                    Text(message).font(SL.body(12.5)).foregroundStyle(SL.danger)
                }

                SLButton(title: "Sign In", variant: .primary, full: true, busy: auth.isBusy) {
                    Task { await auth.signIn(email: email, password: password) }
                }

                SocialSignInButtons(auth: auth)

                HStack(spacing: 5) {
                    Text("New here?").foregroundStyle(SL.muted)
                    NavigationLink { SignUpView(auth: auth) } label: {
                        Text("Create account").foregroundStyle(SL.accent).fontWeight(.bold)
                    }
                    .buttonStyle(.plain)
                }
                .font(SL.body(12.5))
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 4)
            }
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity, minHeight: 640, alignment: .center)
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
    }
}
