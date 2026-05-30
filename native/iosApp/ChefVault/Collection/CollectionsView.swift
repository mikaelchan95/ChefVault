import SwiftUI
import ChefVaultShared

// PLACEHOLDER — replaced by the Collections worker in Phase B batch 2.
struct CollectionsView: View {
    let sdk: ChefVaultSDK
    var body: some View {
        NavigationStack {
            ContentUnavailableView("Collections", systemImage: "square.stack")
                .navigationTitle("Collections")
        }
    }
}
