import SwiftUI
import ChefVaultShared

// PLACEHOLDER — replaced by the Prep Lists worker in Phase B batch 2.
struct PrepListsView: View {
    let sdk: ChefVaultSDK
    var body: some View {
        NavigationStack {
            ContentUnavailableView("Prep Lists", systemImage: "checklist")
                .navigationTitle("Prep Lists")
        }
    }
}
