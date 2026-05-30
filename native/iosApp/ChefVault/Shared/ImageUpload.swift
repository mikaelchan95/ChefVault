import PhotosUI
import SwiftUI
import ChefVaultShared

/// Picks, downscales, and uploads images through the shared `StorageRepository`.
/// HEIC/large originals are transcoded to JPEG (honest content-type, smaller upload).
enum ImageUploader {
    /// Loads a picked item, compresses to JPEG, uploads, and returns the public URL.
    static func upload(
        _ item: PhotosPickerItem,
        to bucket: StorageBucket,
        using storage: StorageRepository,
    ) async throws -> String? {
        guard let data = try await item.loadTransferable(type: Data.self),
              let jpeg = downscaledJpeg(from: data) else { return nil }
        let fileName = "\(UUID().uuidString).jpg"
        return try await storage.upload(
            bucket: bucket,
            fileName: fileName,
            bytes: jpeg.toKotlinByteArray(),
            contentType: "image/jpeg",
        )
    }

    /// Re-encodes to JPEG, capping the longest edge at 1600pt to keep uploads small.
    private static func downscaledJpeg(from data: Data, maxEdge: CGFloat = 1600) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let longest = max(image.size.width, image.size.height)
        let scale = longest > maxEdge ? maxEdge / longest : 1
        let target = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: target)
        let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: target)) }
        return resized.jpegData(compressionQuality: 0.8)
    }
}

extension Data {
    /// Bridges Swift `Data` to a Kotlin `ByteArray` for the shared storage API.
    func toKotlinByteArray() -> KotlinByteArray {
        let array = KotlinByteArray(size: Int32(count))
        withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            let bytes = raw.bindMemory(to: Int8.self)
            for index in 0..<count { array.set(index: Int32(index), value: bytes[index]) }
        }
        return array
    }
}
