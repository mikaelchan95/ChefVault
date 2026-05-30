import PhotosUI
import SwiftUI
import ChefVaultShared

/// Edits name / professional title and uploads a new avatar. Email is read-only.
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

    var body: some View {
        Form {
            Section {
                VStack(spacing: CV.Spacing.md) {
                    ZStack(alignment: .bottomTrailing) {
                        SettingsAvatar(url: avatarUrl, size: 96)
                        PhotosPicker(selection: $pickerItem, matching: .images) {
                            Image(systemName: "camera.fill")
                                .font(.footnote)
                                .padding(CV.Spacing.sm)
                                .background(CV.primary, in: Circle())
                                .foregroundStyle(.white)
                        }
                    }
                    if uploading { ProgressView() }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, CV.Spacing.sm)
                .listRowBackground(Color.clear)
            }

            Section("Name") {
                TextField("Name", text: $name)
            }

            Section("Professional Title") {
                TextField("e.g. Head Chef (optional)", text: $title)
            }

            Section("Email") {
                Text(vm.profile?.email ?? "")
                    .foregroundStyle(.secondary)
            }

            CVErrorLabel(message: vm.errorMessage)
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { Task { await save() } }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || saving || uploading)
            }
        }
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
