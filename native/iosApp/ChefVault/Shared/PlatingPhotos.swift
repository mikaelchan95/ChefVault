import PhotosUI
import SwiftUI
import ChefVaultShared

/// Read-only horizontal gallery with a full-screen paged viewer (recipe detail).
struct PlatingPhotosViewer: View {
    let photos: [String]
    @State private var viewerIndex: Int?

    var body: some View {
        if !photos.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: CV.Spacing.md) {
                    ForEach(Array(photos.enumerated()), id: \.offset) { index, url in
                        AsyncImage(url: URL(string: url)) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Color(.secondarySystemFill)
                        }
                        .frame(width: 120, height: 120)
                        .clipShape(RoundedRectangle(cornerRadius: CV.Radius.lg))
                        .onTapGesture { viewerIndex = index }
                    }
                }
            }
            .fullScreenCover(item: Binding(get: { viewerIndex.map(IdentifiedIndex.init) },
                                           set: { viewerIndex = $0?.value })) { start in
                PhotoPager(photos: photos, start: start.value)
            }
        }
    }
}

private struct IdentifiedIndex: Identifiable { let value: Int; var id: Int { value } }

private struct PhotoPager: View {
    let photos: [String]
    let start: Int
    @Environment(\.dismiss) private var dismiss
    @State private var selection: Int

    init(photos: [String], start: Int) {
        self.photos = photos
        self.start = start
        _selection = State(initialValue: start)
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            TabView(selection: $selection) {
                ForEach(Array(photos.enumerated()), id: \.offset) { index, url in
                    AsyncImage(url: URL(string: url)) { image in
                        image.resizable().scaledToFit()
                    } placeholder: { ProgressView().tint(.white) }
                    .tag(index)
                }
            }
            .tabViewStyle(.page)
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title)
                    .foregroundStyle(.white)
                    .padding()
            }
            Text("\(selection + 1) / \(photos.count)")
                .font(.caption)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .center)
                .frame(maxHeight: .infinity, alignment: .bottom)
                .padding(.bottom, CV.Spacing.xxl)
        }
    }
}

/// Editable gallery used by the recipe form — picks, uploads (via `StorageRepository`),
/// and binds the resulting public URLs. Max 10 photos (ports the RN component).
struct PlatingPhotosEditor: View {
    @Binding var photos: [String]
    let storage: StorageRepository
    @State private var pickerItem: PhotosPickerItem?
    @State private var uploading = false

    var body: some View {
        VStack(alignment: .leading, spacing: CV.Spacing.md) {
            HStack {
                CVSectionHeader(title: "Plating  ·  \(photos.count)/10")
                Spacer()
                if uploading { ProgressView() }
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: CV.Spacing.md) {
                    ForEach(Array(photos.enumerated()), id: \.offset) { index, url in
                        ZStack(alignment: .topTrailing) {
                            AsyncImage(url: URL(string: url)) { image in
                                image.resizable().scaledToFill()
                            } placeholder: { Color(.secondarySystemFill) }
                            .frame(width: 96, height: 96)
                            .clipShape(RoundedRectangle(cornerRadius: CV.Radius.md))
                            Button { photos.remove(at: index) } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.white, .black.opacity(0.6))
                            }
                            .padding(4)
                        }
                    }
                    if photos.count < 10 {
                        PhotosPicker(selection: $pickerItem, matching: .images) {
                            RoundedRectangle(cornerRadius: CV.Radius.md)
                                .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4]))
                                .foregroundStyle(.secondary)
                                .frame(width: 96, height: 96)
                                .overlay(Image(systemName: "camera").foregroundStyle(SL.accent))
                        }
                    }
                }
            }
        }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                uploading = true
                defer { uploading = false; pickerItem = nil }
                if let url = try? await ImageUploader.upload(item, to: .recipeImages, using: storage) {
                    photos.append(url)
                }
            }
        }
    }
}
