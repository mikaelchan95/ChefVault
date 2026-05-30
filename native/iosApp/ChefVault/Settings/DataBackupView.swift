import SwiftUI
import ChefVaultShared

/// Auto-backup toggle (writes to the profile) plus a one-tap JSON export shared via ShareLink.
/// Service Line dark sub-screen: hidden system nav bar + SLSubHeader over SLBackground.
struct DataBackupView: View {
    let sdk: ChefVaultSDK
    @Bindable var vm: SettingsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var exportURL: URL?
    @State private var exporting = false
    @State private var exportError: String?

    var body: some View {
        VStack(spacing: 0) {
            SLSubHeader(title: "Data Backup") { dismiss() }
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    SLSetGroup(title: "Sync") {
                        HStack(spacing: 10) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Auto-backup").font(SL.body(13.5)).foregroundStyle(SL.text)
                                Text("Recipes and collections sync automatically to the cloud.")
                                    .font(SL.body(11.5)).foregroundStyle(SL.muted)
                            }
                            Spacer(minLength: 0)
                            SLToggle(isOn: autoBackupBinding)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 13)
                    }

                    SLKicker("Export").padding(.horizontal, 4).padding(.top, 4)
                    VStack(alignment: .leading, spacing: 10) {
                        SLButton(
                            title: "Export all data (JSON)", icon: "square.and.arrow.up",
                            full: true, busy: exporting,
                        ) {
                            Task { await buildExport() }
                        }
                        if let exportURL {
                            ShareLink(item: exportURL) {
                                HStack(spacing: 7) {
                                    Image(systemName: "doc.badge.arrow.up").font(.system(size: 14, weight: .bold))
                                    Text("Share export file").font(SL.body(14, .bold))
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                                .padding(.horizontal, 18)
                                .foregroundStyle(SL.text)
                                .background(SL.surface2)
                                .overlay(RoundedRectangle(cornerRadius: SL.R.sm).strokeBorder(SL.line2, lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: SL.R.sm))
                            }
                            .buttonStyle(.plain)
                        }
                        if let exportError {
                            Label(exportError, systemImage: "exclamationmark.triangle.fill")
                                .font(SL.body(12))
                                .foregroundStyle(SL.danger)
                        }
                    }
                }
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 16)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
    }

    private var autoBackupBinding: Binding<Bool> {
        Binding(
            get: { vm.profile?.autoBackup ?? false },
            set: { newValue in
                Task {
                    await vm.update(.change(autoBackup: KotlinBoolean(bool: newValue)))
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
