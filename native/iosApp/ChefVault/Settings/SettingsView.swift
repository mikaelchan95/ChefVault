import SwiftUI
import ChefVaultShared

/// Settings tab root — Service Line dark hub: profile row, Pro card, and grouped
/// setting cards that NavigationLink into the per-topic detail screens, plus a
/// destructive sign-out. Visual layer only; profile wiring lives in `SettingsViewModel`.
struct SettingsView: View {
    let sdk: ChefVaultSDK
    let auth: AuthViewModel
    @State private var vm: SettingsViewModel
    @State private var confirmSignOut = false
    @AppStorage("appearance") private var appearance = "system"

    init(sdk: ChefVaultSDK, auth: AuthViewModel) {
        self.sdk = sdk
        self.auth = auth
        _vm = State(initialValue: SettingsViewModel(repo: sdk.profile))
    }

    private var appearanceLabel: String {
        switch appearance {
        case "light": return "Light"
        case "dark": return "Dark"
        default: return "System"
        }
    }

    private var isPro: Bool { vm.profile?.plan == .pro }
    private var name: String { vm.profile?.name ?? "—" }
    private var subtitle: String {
        let title = vm.profile?.title?.nilIfBlank
        let email = vm.profile?.email ?? ""
        return [title, email.nilIfBlank].compactMap { $0 }.joined(separator: " · ")
    }
    private var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first }.map(String.init).joined()
        return letters.isEmpty ? String(name.prefix(1)).uppercased() : letters.uppercased()
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                SLAppBar(title: "Settings")
                ScrollView {
                    VStack(spacing: 14) {
                        profileRow
                        proCard
                        accountGroup
                        preferencesGroup
                        dataGroup
                        SLButton(title: "Log Out", variant: .danger, full: true) {
                            confirmSignOut = true
                        }
                        Text("CHEFVAULT v1.0.0 · WINERY APPS")
                            .font(SL.mono(10))
                            .foregroundStyle(SL.faint)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 4)
                    }
                    .padding(.horizontal, SL.Pad.screen)
                    .padding(.bottom, 126)
                }
            }
            .background(SLBackground())
            .toolbar(.hidden, for: .navigationBar)
            .task { await vm.observe() }
            .task { await vm.refresh() }
            .confirmationDialog("Sign out of ChefVault?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign Out", role: .destructive) { Task { await auth.signOut() } }
            }
        }
    }

    // MARK: - Profile row

    private var profileRow: some View {
        NavigationLink {
            ProfileView(sdk: sdk, vm: vm)
        } label: {
            HStack(spacing: 13) {
                SLTile(letter: initials, size: 58, corner: 29)
                VStack(alignment: .leading, spacing: 3) {
                    Text(name).font(SL.display(17, .bold)).foregroundStyle(SL.text)
                    Text(subtitle).font(SL.body(12)).foregroundStyle(SL.muted).lineLimit(1)
                }
                Spacer(minLength: 0)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Pro card

    private var proCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                (Text("ChefVault ").foregroundStyle(SL.text)
                    + Text("Pro").foregroundStyle(SL.accent))
                    .font(SL.display(16, .heavy))
                Spacer(minLength: 0)
                if isPro {
                    Text("ACTIVE")
                        .font(SL.mono(9.5, .bold))
                        .foregroundStyle(SL.onAccent)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(SL.accent, in: Capsule())
                }
            }
            VStack(alignment: .leading, spacing: 8) {
                proFeature("Unlimited recipes")
                proFeature("Ingredient costing")
                proFeature("Team Sync — coming soon", faint: true)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: SL.R.md, style: .continuous)
                .strokeBorder(SL.line, lineWidth: 1),
        )
    }

    private func proFeature(_ text: String, faint: Bool = false) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(faint ? SL.faint : SL.accent)
            Text(text)
                .font(SL.body(13))
                .foregroundStyle(faint ? SL.faint : SL.text)
            Spacer(minLength: 0)
        }
    }

    // MARK: - Grouped settings

    private var accountGroup: some View {
        SLSetGroup(title: "Account & Security") {
            SLSetRow(label: "Profile Information", value: "Edit") {
                ProfileView(sdk: sdk, vm: vm)
            }
            SLDivider()
            SLSetRow(label: "Subscription", value: isPro ? "Pro" : "Free") {
                SubscriptionView()
            }
            SLDivider()
            SLSetRow(label: "Security & Password", value: "Manage") {
                SecurityView(sdk: sdk)
            }
        }
    }

    private var preferencesGroup: some View {
        SLSetGroup(title: "Preferences") {
            SLSetRow(label: "Appearance", value: appearanceLabel) {
                AppearanceView()
            }
            SLDivider()
            SLSetRow(
                label: "Default units",
                value: vm.profile?.defaultUnits == .imperial ? "Imperial" : "Metric",
            ) {
                UnitsView(vm: vm)
            }
            SLDivider()
            SLSetRow(label: "Language", value: LanguageView.label(for: vm.profile?.language ?? "en")) {
                LanguageView(vm: vm)
            }
        }
    }

    private var dataGroup: some View {
        SLSetGroup(title: "Data") {
            SLSetRow(
                label: "Auto-backup",
                toggle: Binding(
                    get: { vm.profile?.autoBackup ?? false },
                    set: { on in Task { await vm.update(.change(autoBackup: KotlinBoolean(bool: on))) } },
                ),
            )
            SLDivider()
            SLSetRow(label: "Export all data", value: "") {
                DataBackupView(sdk: sdk, vm: vm)
            }
        }
    }
}

// MARK: - Grouped setting row (SLSetGroup lives in the shared SL kit)

/// One row inside a grouped card: a label plus either a toggle or a mono "value ›" stamp.
/// The valued variant is a `NavigationLink` to a destination; the toggle variant is inert
/// chrome around a bound switch.
private struct SLSetRow<Destination: View>: View {
    let label: String
    var value: String?
    var toggle: Binding<Bool>?
    var destination: (() -> Destination)?

    /// Navigating row with a "value ›" stamp.
    init(label: String, value: String, @ViewBuilder destination: @escaping () -> Destination) {
        self.label = label
        self.value = value
        self.destination = destination
    }

    var body: some View {
        if let destination {
            NavigationLink {
                destination()
            } label: {
                content { stamp }
            }
            .buttonStyle(.plain)
        } else {
            content { toggle.map { SLToggle(isOn: $0) } }
        }
    }

    private func content<Trailing: View>(@ViewBuilder trailing: () -> Trailing) -> some View {
        HStack(spacing: 10) {
            Text(label).font(SL.body(13.5)).foregroundStyle(SL.text)
            Spacer(minLength: 0)
            trailing()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .contentShape(Rectangle())
    }

    @ViewBuilder private var stamp: some View {
        let v = value ?? ""
        Text(v.isEmpty ? "›" : "\(v) ›")
            .font(SL.mono(12))
            .foregroundStyle(SL.muted)
    }
}

private extension SLSetRow where Destination == EmptyView {
    /// Toggle row — no navigation.
    init(label: String, toggle: Binding<Bool>) {
        self.label = label
        self.value = nil
        self.toggle = toggle
        self.destination = nil
    }
}

/// Circular avatar with a `person.circle` placeholder, reused by `ProfileView`.
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
