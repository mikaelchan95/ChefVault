import SwiftUI

struct ForgotPasswordView: View {
    let auth: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var sent = false

    var body: some View {
        ScrollView {
            if sent {
                VStack(spacing: CV.Spacing.lg) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.green)
                    Text("Check your email").font(.title2.bold())
                    Text("If an account exists for \(email), a reset link is on its way.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    CVPrimaryButton(title: "Back to Sign In") { dismiss() }
                }
                .padding(CV.Spacing.xl)
                .padding(.top, CV.Spacing.xxxl)
            } else {
                VStack(spacing: CV.Spacing.lg) {
                    Text("Reset Password")
                        .font(.title.bold())
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text("Enter your email and we'll send a reset link.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    CVTextField(title: "Email address", text: $email, systemImage: "envelope", keyboard: .emailAddress)
                    CVErrorLabel(message: auth.errorMessage)

                    CVPrimaryButton(title: "Send Reset Link", busy: auth.isBusy) {
                        Task {
                            await auth.resetPassword(email: email)
                            if auth.errorMessage == nil { sent = true }
                        }
                    }
                }
                .padding(CV.Spacing.xl)
            }
        }
        .navigationTitle("Forgot Password")
        .navigationBarTitleDisplayMode(.inline)
    }
}
