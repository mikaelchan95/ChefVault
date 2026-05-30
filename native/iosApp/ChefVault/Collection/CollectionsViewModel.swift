import SwiftUI
import ChefVaultShared

/// Owns the collections list state. Observes the shared `CollectionRepository.collections`
/// StateFlow (via SKIE AsyncSequence) and drives create/refresh through suspend funcs.
@MainActor
@Observable
final class CollectionsViewModel {
    private let repo: CollectionRepository

    var collections: [ChefVaultShared.Collection] = []
    var errorMessage: String?

    init(repo: CollectionRepository) {
        self.repo = repo
    }

    /// Long-lived collection of the repository's StateFlow.
    func observe() async {
        for await list in repo.collections {
            collections = list
        }
    }

    func refresh() async {
        do {
            try await repo.refresh()
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

// MARK: - Shared color helpers

/// Parses a "#RRGGBB" hex string into a SwiftUI Color, or nil if malformed.
func colorFromHex(_ hex: String?) -> Color? {
    guard var value = hex?.trimmingCharacters(in: .whitespaces) else { return nil }
    if value.hasPrefix("#") { value.removeFirst() }
    guard value.count == 6, let int = UInt32(value, radix: 16) else { return nil }
    let r = Double((int >> 16) & 0xFF) / 255.0
    let g = Double((int >> 8) & 0xFF) / 255.0
    let b = Double(int & 0xFF) / 255.0
    return Color(red: r, green: g, blue: b)
}

/// Stable fallback color derived from a collection name, so cards without an
/// explicit color still look distinct and consistent across launches.
func derivedColor(for name: String) -> Color {
    let palette: [Color] = collectionPresetHexes.compactMap { colorFromHex($0) }
    guard !palette.isEmpty else { return CV.primary }
    var hash = 5381
    for scalar in name.unicodeScalars { hash = (hash &* 33) &+ Int(scalar.value) }
    return palette[abs(hash) % palette.count]
}

/// The hero/swatch color for a collection: explicit hex if valid, else derived.
func heroColor(for collection: ChefVaultShared.Collection) -> Color {
    colorFromHex(collection.color) ?? derivedColor(for: collection.name)
}

/// Preset swatch palette offered in the create form (and reused for fallbacks).
let collectionPresetHexes: [String] = [
    "#FF7A00", "#EF4444", "#22C55E", "#3B82F6",
    "#A855F7", "#EC4899", "#F59E0B", "#14B8A6",
]
