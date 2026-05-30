import SwiftUI
import ChefVaultShared

/// Settings tab root — inset-grouped Form over the shared profile, with NavigationLinks
/// into the per-topic detail screens and a destructive sign-out.
struct SettingsView: View {
    let sdk: ChefVaultSDK
    let auth: AuthViewModel
    @State private var vm: SettingsViewModel
    @State private var confirmSignOut = false

    init(sdk: ChefVaultSDK, auth: AuthViewModel) {
        self.sdk = sdk
        self.auth = auth
        _vm = State(initialValue: SettingsViewModel(repo: sdk.profile))
    }

    var body: some View {
        NavigationStack {
            List {
                profileHeader
                accountSection
                preferencesSection
                signOutSection
            }
            .navigationTitle("Settings")
            .task { await vm.observe() }
            .task { await vm.refresh() }
            .confirmationDialog("Sign out of ChefVault?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign Out", role: .destructive) { Task { await auth.signOut() } }
            }
            .safeAreaInset(edge: .bottom) {
                Text("v0.1.0")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, CV.Spacing.sm)
            }
        }
    }

    // MARK: - Sections

    private var profileHeader: some View {
        Section {
            NavigationLink {
                ProfileView(sdk: sdk, vm: vm)
            } label: {
                HStack(spacing: CV.Spacing.lg) {
                    SettingsAvatar(url: vm.profile?.avatarUrl, size: 56)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(vm.profile?.name ?? "—").font(.headline)
                        if let title = vm.profile?.title, !title.isEmpty {
                            Text(title).font(.subheadline).foregroundStyle(.secondary)
                        }
                        Text(vm.profile?.email ?? "").font(.footnote).foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, CV.Spacing.xs)
            }
        }
    }

    private var accountSection: some View {
        Section("Account & Security") {
            NavigationLink {
                ProfileView(sdk: sdk, vm: vm)
            } label: { Label("Profile Information", systemImage: "person") }

            NavigationLink {
                SubscriptionView(vm: vm)
            } label: { Label("Subscription", systemImage: "creditcard") }

            NavigationLink {
                SecurityView(sdk: sdk)
            } label: { Label("Security & Password", systemImage: "lock") }
        }
    }

    private var preferencesSection: some View {
        Section("App Preferences") {
            NavigationLink {
                UnitsView(vm: vm)
            } label: {
                settingRow(
                    "Default Units", systemImage: "ruler",
                    trailing: vm.profile?.defaultUnits == .imperial ? "Imperial" : "Metric",
                )
            }

            NavigationLink {
                DataBackupView(sdk: sdk, vm: vm)
            } label: {
                settingRow(
                    "Data Backup", systemImage: "icloud",
                    trailing: (vm.profile?.autoBackup ?? false) ? "Auto-sync ON" : "Auto-sync OFF",
                )
            }

            NavigationLink {
                LanguageView(vm: vm)
            } label: {
                settingRow(
                    "Language", systemImage: "globe",
                    trailing: LanguageView.label(for: vm.profile?.language ?? "en"),
                )
            }
        }
    }

    private var signOutSection: some View {
        Section {
            Button(role: .destructive) { confirmSignOut = true } label: {
                Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
            }
        }
    }

    private func settingRow(_ title: String, systemImage: String, trailing: String) -> some View {
        HStack {
            Label(title, systemImage: systemImage)
            Spacer()
            Text(trailing).font(.subheadline).foregroundStyle(.secondary)
        }
    }
}

/// Circular avatar with a `person.circle` placeholder, reused across the Settings screens.
struct SettingsAvatar: View {
    let url: String?
    var size: CGFloat = 56

    var body: some View {
        AsyncImage(url: url.flatMap(URL.init(string:))) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Image(systemName: "person.circle.fill")
                .resizable()
                .scaledToFit()
                .foregroundStyle(.secondary)
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}
