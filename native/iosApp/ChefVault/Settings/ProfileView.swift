import PhotosUI
import SwiftUI
import ChefVaultShared

/// Edits name / professional title and uploads a new avatar. Email is read-only.
/// Service Line sub-screen: hidden system nav bar, SLSubHeader at top, ember background.
struct ProfileView: View {
    let sdk: ChefVaultSDK
    @Bindable var vm: SettingsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var title = ""
    @State private var avatarUrl: String?
    @State private var pickerItem: PhotosPickerItem?
    @State private var uploading = false
    @State private var saving = false
    @State private var loaded = false

    private var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first }.map(String.init).joined()
        return letters.isEmpty ? String(name.prefix(1)).uppercased() : letters.uppercased()
    }

    var body: some View {
        VStack(spacing: 0) {
            SLSubHeader(title: "Profile", back: "Settings") { dismiss() }
            ScrollView {
                VStack(spacing: 16) {
                    avatar
                    SLTextField(placeholder: "Full name", text: $name, systemImage: "person")
                    SLTextField(placeholder: "Title / role (optional)", text: $title, systemImage: "briefcase")
                    SLField(label: "Email", value: vm.profile?.email ?? "", trailing: "🔒")
                    if let message = vm.errorMessage {
                        Text(message).font(SL.body(12.5)).foregroundStyle(SL.danger)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    SLButton(
                        title: "Save changes",
                        full: true,
                        busy: saving,
                    ) {
                        Task { await save() }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || saving || uploading)
                    .padding(.top, 4)
                }
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 18)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
        .onAppear(perform: loadIfNeeded)
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                uploading = true
                defer { uploading = false; pickerItem = nil }
                if let url = try? await ImageUploader.upload(item, to: .avatars, using: sdk.storage) {
                    avatarUrl = url
                }
            }
        }
    }

    // MARK: - Avatar

    private var avatar: some View {
        VStack(spacing: 9) {
            PhotosPicker(selection: $pickerItem, matching: .images) {
                ZStack(alignment: .bottomTrailing) {
                    if let avatarUrl, let url = URL(string: avatarUrl) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            SLTile(letter: initials, size: 80, corner: 40)
                        }
                        .frame(width: 80, height: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 40))
                        .overlay(RoundedRectangle(cornerRadius: 40).strokeBorder(SL.line2, lineWidth: 1))
                    } else {
                        SLTile(letter: initials, size: 80, corner: 40)
                    }
                    Image(systemName: "pencil")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(SL.onAccent)
                        .frame(width: 28, height: 28)
                        .background(SL.accent, in: Circle())
                        .overlay(Circle().strokeBorder(SL.bg, lineWidth: 2))
                        .offset(x: 2, y: 2)
                }
            }
            .buttonStyle(.plain)
            if uploading {
                ProgressView().tint(SL.accent)
            } else {
                Text("Tap to change avatar (square crop)")
                    .font(SL.body(11.5)).foregroundStyle(SL.muted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 2)
    }

    private func loadIfNeeded() {
        guard !loaded, let profile = vm.profile else { return }
        name = profile.name
        title = profile.title ?? ""
        avatarUrl = profile.avatarUrl
        loaded = true
    }

    private func save() async {
        saving = true
        defer { saving = false }
        let ok = await vm.update(.change(
            name: name,
            title: title.isEmpty ? nil : title,
            avatarUrl: avatarUrl,
        ))
        if ok { dismiss() }
    }
}
