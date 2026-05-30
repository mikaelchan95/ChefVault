import SwiftUI
import ChefVaultShared

/// Change password (with strength meter) and a danger zone for account deletion.
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

    private var canSubmit: Bool {
        !currentPassword.isEmpty && newPassword.count >= 8 && newPassword == confirmPassword && !saving
    }

    var body: some View {
        Form {
            Section("Change Password") {
                CVTextField(title: "Current Password", text: $currentPassword, systemImage: "lock", isSecure: true)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                CVTextField(title: "New Password", text: $newPassword, systemImage: "lock.rotation", isSecure: true)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                PasswordStrengthBar(password: newPassword)
                CVTextField(title: "Confirm New Password", text: $confirmPassword, systemImage: "lock.rotation", isSecure: true)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                if !confirmPassword.isEmpty && newPassword != confirmPassword {
                    Text("Passwords do not match.").font(.footnote).foregroundStyle(.red)
                }
            }

            Section {
                CVPrimaryButton(title: "Update Password", busy: saving) { Task { await updatePassword() } }
                    .disabled(!canSubmit)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                if let successMessage {
                    Label(successMessage, systemImage: "checkmark.circle.fill")
                        .font(.footnote).foregroundStyle(.green)
                }
                CVErrorLabel(message: errorMessage)
            }

            Section("Danger Zone") {
                Button(role: .destructive) { confirmDelete = true } label: {
                    if deleting {
                        ProgressView()
                    } else {
                        Label("Delete Account", systemImage: "trash")
                    }
                }
                .disabled(deleting)
            }
        }
        .navigationTitle("Security")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            "Delete your account? This permanently removes all your data and cannot be undone.",
            isPresented: $confirmDelete, titleVisibility: .visible,
        ) {
            Button("Delete Account", role: .destructive) { Task { await deleteAccount() } }
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
