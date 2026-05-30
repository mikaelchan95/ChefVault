import SwiftUI
import ChefVaultShared

/// Auto-sync toggle (writes to the profile) plus a one-tap JSON export shared via ShareLink.
struct DataBackupView: View {
    let sdk: ChefVaultSDK
    @Bindable var vm: SettingsViewModel

    @State private var exportURL: URL?
    @State private var exporting = false
    @State private var exportError: String?

    var body: some View {
        Form {
            Section {
                Toggle(isOn: autoBackupBinding) {
                    Label("Auto-sync", systemImage: "icloud")
                }
                .tint(CV.primary)
            } footer: {
                Text("When on, your recipes and collections sync automatically to the cloud.")
            }

            Section("Export") {
                Button { Task { await buildExport() } } label: {
                    if exporting {
                        ProgressView()
                    } else {
                        Label("Export all data (JSON)", systemImage: "square.and.arrow.up")
                    }
                }
                .disabled(exporting)

                if let exportURL {
                    ShareLink(item: exportURL) {
                        Label("Share export file", systemImage: "doc.badge.arrow.up")
                    }
                }
                CVErrorLabel(message: exportError)
            }
        }
        .navigationTitle("Data Backup")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var autoBackupBinding: Binding<Bool> {
        Binding(
            get: { vm.profile?.autoBackup ?? false },
            set: { newValue in
                Task {
                    await vm.update(ProfileUpdate(
                        name: nil, title: nil, avatarUrl: nil,
                        defaultUnits: nil, language: nil,
                        autoBackup: KotlinBoolean(bool: newValue),
                    ))
                }
            },
        )
    }

    private func buildExport() async {
        exporting = true
        exportError = nil
        defer { exporting = false }
        let json = ExportBuilder.shared.build(
            recipes: sdk.recipes.recipes.value,
            collections: sdk.collections.collections.value,
            prepLists: sdk.prepLists.prepLists.value,
            profile: sdk.profile.profile.value,
            exportedAt: ISO8601DateFormatter().string(from: Date()),
        )
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("chefvault-export.json")
        do {
            try json.write(to: url, atomically: true, encoding: .utf8)
            exportURL = url
        } catch {
            exportError = (error as NSError).localizedDescription
        }
    }
}
