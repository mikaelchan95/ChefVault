import SwiftUI
import ChefVaultShared

/// Change password (with strength meter) and a danger zone for account deletion.
/// Service Line dark sub-screen: hidden system nav bar + SLSubHeader over SLBackground.
struct SecurityView: View {
    let sdk: ChefVaultSDK
    @Environment(\.dismiss) private var dismiss

    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    @State private var confirmDelete = false
    @State private var deleting = false

    private var passwordsMismatch: Bool {
        !confirmPassword.isEmpty && newPassword != confirmPassword
    }

    private var canSubmit: Bool {
        !currentPassword.isEmpty && newPassword.count >= 8 && newPassword == confirmPassword && !saving
    }

    var body: some View {
        VStack(spacing: 0) {
            SLSubHeader(title: "Security") { dismiss() }
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    SLKicker("Change password").padding(.horizontal, 4)
                    VStack(alignment: .leading, spacing: 10) {
                        SLTextField(
                            placeholder: "Current password", text: $currentPassword,
                            systemImage: "lock", secure: true,
                        )
                        SLTextField(
                            placeholder: "New password", text: $newPassword,
                            systemImage: "lock.rotation", secure: true,
                        )
                        PasswordStrengthBar(password: newPassword)
                        SLTextField(
                            placeholder: "Confirm new password", text: $confirmPassword,
                            systemImage: "lock.rotation", secure: true,
                        )
                        if passwordsMismatch {
                            Text("Passwords do not match.")
                                .font(SL.body(12))
                                .foregroundStyle(SL.danger)
                        }
                        SLButton(title: "Update password", full: true, busy: saving) {
                            Task { await updatePassword() }
                        }
                        .disabled(!canSubmit)
                        .opacity(canSubmit ? 1 : 0.5)
                        if let successMessage {
                            Label(successMessage, systemImage: "checkmark.circle.fill")
                                .font(SL.body(12))
                                .foregroundStyle(SL.good)
                        }
                        if let errorMessage {
                            Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                                .font(SL.body(12))
                                .foregroundStyle(SL.danger)
                        }
                    }

                    SLKicker("Danger zone").padding(.horizontal, 4).padding(.top, 8)
                    SLButton(title: "Delete account…", variant: .danger, full: true, busy: deleting) {
                        confirmDelete = true
                    }
                    Text("This cascades all recipes, collections, prep lists, photos and your login. It cannot be undone.")
                        .font(SL.body(12))
                        .foregroundStyle(SL.muted)
                        .padding(.horizontal, 4)
                }
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 16)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
        .confirmationDialog(
            "Delete your account? This permanently removes all your data and cannot be undone.",
            isPresented: $confirmDelete, titleVisibility: .visible,
        ) {
            Button("Delete account", role: .destructive) { Task { await deleteAccount() } }
        }
    }

    private func updatePassword() async {
        saving = true
        errorMessage = nil
        successMessage = nil
        defer { saving = false }
        do {
            try await sdk.auth.updatePassword(newPassword: newPassword)
            successMessage = "Password updated."
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }

    private func deleteAccount() async {
        deleting = true
        errorMessage = nil
        defer { deleting = false }
        do {
            try await sdk.auth.deleteAccount()
            // deleteAccount signs out server-side; AuthViewModel observes the state change.
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}
