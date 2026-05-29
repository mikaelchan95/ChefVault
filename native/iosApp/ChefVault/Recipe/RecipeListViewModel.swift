import SwiftUI
import ChefVaultShared

/// Owns the recipe list state. Observes the shared `RecipeRepository.recipes`
/// StateFlow (via SKIE AsyncSequence) and drives create/refresh through suspend funcs.
@MainActor
@Observable
final class RecipeListViewModel {
    private let repo: RecipeRepository

    var recipes: [Recipe] = []
    var isLoading = false
    var errorMessage: String?

    init(repo: RecipeRepository) {
        self.repo = repo
    }

    /// Long-lived collection of the repository's StateFlow.
    func observe() async {
        for await list in repo.recipes {
            recipes = list
        }
    }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await repo.refresh()
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }

    /// Returns true on success. Maps the server-side 50-recipe trigger error to the
    /// same user-facing message the original app used.
    func add(_ form: NewRecipe) async -> Bool {
        errorMessage = nil
        do {
            _ = try await repo.addRecipe(form: form)
            return true
        } catch {
            let message = (error as NSError).localizedDescription
            errorMessage = (message.contains("limit") || message.contains("50"))
                ? "Free plan limit reached (50 recipes). Upgrade to Pro for unlimited."
                : message
            return false
        }
    }
}
