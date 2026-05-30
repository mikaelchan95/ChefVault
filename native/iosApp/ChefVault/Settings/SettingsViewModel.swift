import SwiftUI
import ChefVaultShared

/// Observes the shared `ProfileRepository.profile` StateFlow and drives profile updates.
/// Shared by the Settings root and every detail screen that reads/writes the profile.
@MainActor
@Observable
final class SettingsViewModel {
    private let repo: ProfileRepository

    var profile: UserProfile?
    var errorMessage: String?

    init(repo: ProfileRepository) {
        self.repo = repo
    }

    /// Long-lived observation of the shared profile state. Started from a `.task`.
    func observe() async {
        for await value in repo.profile {
            profile = value
        }
    }

    func refresh() async {
        do {
            try await repo.refresh()
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }

    /// Applies a partial update. Returns true on success.
    @discardableResult
    func update(_ update: ProfileUpdate) async -> Bool {
        errorMessage = nil
        do {
            try await repo.update(update: update)
            return true
        } catch {
            errorMessage = (error as NSError).localizedDescription
            return false
        }
    }
}
