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

            VStack(alignment: .leading, spacing: 4) {
                Text("Create account")
                    .font(SL.display(26, .heavy))
                    .foregroundStyle(SL.text)
                Text("Free plan · up to 50 recipes")
                    .font(SL.body(13))
                    .foregroundStyle(SL.muted)
            }
            .padding(.bottom, 9)

            SLTextField(placeholder: "Jordan Lee", text: $name, systemImage: "person")
            SLTextField(placeholder: "chef@restaurant.com", text: $email,
                        systemImage: "envelope", keyboard: .emailAddress)
            SLTextField(placeholder: "Password", text: $password,
                        systemImage: "lock", secure: true)
            PasswordStrengthBar(password: password)

            if let message = auth.errorMessage {
                Text(message).font(SL.body(12.5)).foregroundStyle(SL.danger)
            }

            SLButton(title: "Create account", variant: .primary, full: true, busy: auth.isBusy) {
                Task {
                    let needsConfirmation = await auth.signUp(email: email, password: password, name: name)
                    if needsConfirmation { confirmationSent = true }
                    // Otherwise the auth-state flow flips to authenticated and the root view swaps.
                }
            }

            Text("Inline validation · email confirmation sent after submit")
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

    private var confirmationState: some View {
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

            (Text("We sent a link to ")
                .foregroundStyle(SL.muted)
             + Text(email.isEmpty ? "your inbox" : email)
                .foregroundStyle(SL.text).fontWeight(.semibold)
             + Text(". Tap it to confirm and start cooking.")
                .foregroundStyle(SL.muted))
                .font(SL.body(13))
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
