import SwiftUI

struct ForgotPasswordView: View {
    let auth: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var sent = false

    var body: some View {
        ScrollView {
            if sent {
                sentState
            } else {
                form
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
    }

    private var backButton: some View {
        Button { dismiss() } label: {
            HStack(spacing: 2) {
                Image(systemName: "chevron.left").font(.system(size: 14, weight: .semibold))
                Text("Back").font(SL.body(13.5))
            }
            .foregroundStyle(SL.muted)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: 13) {
            backButton

            VStack(alignment: .leading, spacing: 7) {
                Text("Reset password")
                    .font(SL.display(26, .heavy))
                    .foregroundStyle(SL.text)
                Text("Enter your account email and we'll send a reset link.")
                    .font(SL.body(13))
                    .foregroundStyle(SL.muted)
            }
            .padding(.bottom, 9)

            SLTextField(placeholder: "chef@restaurant.com", text: $email,
                        systemImage: "envelope", keyboard: .emailAddress)

            if let message = auth.errorMessage {
                Text(message).font(SL.body(12.5)).foregroundStyle(SL.danger)
            }

            SLButton(title: "Send reset link", variant: .primary, full: true, busy: auth.isBusy) {
                Task {
                    await auth.resetPassword(email: email)
                    if auth.errorMessage == nil { sent = true }
                }
            }
            .padding(.top, 4)

            Text("Always shows success — never reveals whether an email exists.")
                .font(SL.body(11.5))
                .foregroundStyle(SL.faint)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
        }
        .padding(.horizontal, 24)
        .padding(.top, 8)
        .frame(maxWidth: .infinity, minHeight: 640, alignment: .center)
    }

    private var sentState: some View {
        VStack(spacing: 0) {
            RoundedRectangle(cornerRadius: SL.R.lg)
                .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [5]))
                .foregroundStyle(SL.line2)
                .frame(width: 70, height: 70)
                .overlay(Image(systemName: "envelope").font(.system(size: 28)).foregroundStyle(SL.accent))
                .padding(.bottom, 18)

            Text("Check your email")
                .font(SL.display(23, .heavy))
                .foregroundStyle(SL.text)

            Text("If an account exists for \(email.isEmpty ? "that address" : email), a reset link is on its way.")
                .font(SL.body(13))
                .foregroundStyle(SL.muted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 250)
                .padding(.top, 9)

            SLButton(title: "Back to Sign In", variant: .secondary, full: true) { dismiss() }
                .padding(.top, 24)
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, minHeight: 640, alignment: .center)
    }
}
