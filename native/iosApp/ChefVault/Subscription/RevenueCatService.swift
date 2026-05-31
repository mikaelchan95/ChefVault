import Foundation
import SwiftUI
import RevenueCat

/// Thin wrapper around the RevenueCat SDK. This is the single source of truth for
/// purchase + entitlement state on iOS (the chosen path is the native SDK rather
/// than purchases-kmp, so this lives in Swift instead of the shared module).
///
/// Reconciliation with Supabase: RevenueCat is the *live* unlock signal here
/// (`isPro`), giving the user instant access the moment a purchase completes. The
/// durable gate the rest of the app reads is `profiles.plan`, which a
/// RevenueCat → Supabase webhook flips server-side; the server cap triggers
/// (recipes / collections / prep lists) key off `profiles.plan`, so a freshly
/// purchased user is fully unlocked once that webhook lands (usually seconds).
@MainActor
@Observable
final class RevenueCatService {
    /// MUST match the entitlement identifier configured in the RevenueCat
    /// dashboard. Rename the auto-generated entitlement to exactly `pro`.
    static let proEntitlementID = "pro"

    private(set) var isPro = false
    private(set) var monthly: Package?
    private(set) var annual: Package?
    private(set) var lifetime: Package?
    private(set) var offeringsLoaded = false
    var purchasing = false
    var lastError: String?

    /// Call once at launch, before any other RevenueCat use. The public SDK key is
    /// injected per-platform via `Secrets.xcconfig` → Info.plist (never hardcoded).
    /// No-ops when the key is absent so test/CI builds don't crash.
    nonisolated static func configure(apiKey: String) {
        guard !apiKey.isEmpty else { return }
        Purchases.logLevel = .info
        Purchases.configure(withAPIKey: apiKey)
    }

    /// Long-lived stream of entitlement changes. Start once from a root `.task`.
    func observe() async {
        guard Purchases.isConfigured else { return }
        if let info = try? await Purchases.shared.customerInfo() {
            isPro = info.entitlements.active[Self.proEntitlementID]?.isActive == true
        }
        for await info in Purchases.shared.customerInfoStream {
            isPro = info.entitlements.active[Self.proEntitlementID]?.isActive == true
        }
    }

    /// Pull the current offering's monthly + annual packages for the paywall.
    func loadOfferings() async {
        guard Purchases.isConfigured else { return }
        do {
            let offerings = try await Purchases.shared.offerings()
            guard let current = offerings.current else { return }
            monthly = current.monthly ?? current.availablePackages.first { $0.packageType == .monthly }
            annual = current.annual ?? current.availablePackages.first { $0.packageType == .annual }
            lifetime = current.lifetime ?? current.availablePackages.first { $0.packageType == .lifetime }
            offeringsLoaded = true
        } catch {
            lastError = error.localizedDescription
        }
    }

    /// Returns true when the purchase completed (false on user cancel or error).
    @discardableResult
    func purchase(_ package: Package) async -> Bool {
        guard Purchases.isConfigured else { return false }
        lastError = nil
        purchasing = true
        defer { purchasing = false }
        do {
            let result = try await Purchases.shared.purchase(package: package)
            if result.userCancelled { return false }
            isPro = result.customerInfo.entitlements.active[Self.proEntitlementID]?.isActive == true
            return isPro
        } catch {
            lastError = error.localizedDescription
            return false
        }
    }

    /// Restores prior purchases (Apple requires this on any paywall).
    @discardableResult
    func restore() async -> Bool {
        guard Purchases.isConfigured else { return false }
        lastError = nil
        do {
            let info = try await Purchases.shared.restorePurchases()
            isPro = info.entitlements.active[Self.proEntitlementID]?.isActive == true
            return isPro
        } catch {
            lastError = error.localizedDescription
            return false
        }
    }

    /// Bind RevenueCat purchases to the Supabase user id so the webhook can map
    /// `app_user_id` → `profiles.id`. Call on sign-in.
    func logIn(_ userID: String) async {
        guard Purchases.isConfigured, !userID.isEmpty else { return }
        _ = try? await Purchases.shared.logIn(userID)
    }

    /// Revert to an anonymous RevenueCat id on sign-out (prevents entitlement
    /// leakage across accounts on a shared device).
    func logOut() async {
        guard Purchases.isConfigured else { return }
        _ = try? await Purchases.shared.logOut()
    }
}

extension Error {
    /// True when the shared/server layer reports a free-plan cap being hit
    /// (recipes, collections, or prep lists). Matches the server RAISE messages,
    /// e.g. "Free plan recipe limit reached (50). ...".
    var isFreePlanLimit: Bool {
        let message = (self as NSError).localizedDescription
        return message.contains("Free plan") || message.contains("limit")
    }
}

extension View {
    /// Presents the upgrade paywall as a sheet. Reused by every create flow that
    /// can hit a free-plan cap.
    func paywallSheet(isPresented: Binding<Bool>) -> some View {
        sheet(isPresented: isPresented) { SubscriptionView() }
    }
}
