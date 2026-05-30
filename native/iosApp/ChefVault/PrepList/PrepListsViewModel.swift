import SwiftUI
import ChefVaultShared

/// Owns the prep-list state. Observes the shared `PrepListRepository.prepLists`
/// StateFlow (via SKIE AsyncSequence) and drives toggle/refresh/delete through suspend funcs.
@MainActor
@Observable
final class PrepListsViewModel {
    private let repo: PrepListRepository

    var lists: [PrepList] = []
    var errorMessage: String?

    init(repo: PrepListRepository) {
        self.repo = repo
    }

    /// Long-lived collection of the repository's StateFlow.
    func observe() async {
        for await value in repo.prepLists {
            lists = value
        }
    }

    func refresh() async {
        do {
            try await repo.refresh()
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }

    func toggle(listId: String, itemId: String) async {
        do {
            try await repo.toggleItem(listId: listId, itemId: itemId)
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }

    func delete(id: String) async {
        do {
            try await repo.delete(id: id)
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}
