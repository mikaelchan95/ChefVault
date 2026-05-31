import SwiftUI
import RevenueCat
import ChefVaultShared

/// Plan card + Free-vs-Pro comparison + live RevenueCat paywall (monthly/annual
/// packages, purchase, restore). Reads entitlement state from `RevenueCatService`
/// in the environment, so it can be presented standalone from any cap-trigger
/// sheet as well as from Settings.
/// Service Line dark sub-screen: hidden system nav bar + SLSubHeader over SLBackground.
struct SubscriptionView: View {
    @Environment(RevenueCatService.self) private var rc
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var selected: Package?

    private struct Feature: Identifiable {
        let id = UUID()
        let label: String
        let free: String
        let pro: String
    }

    private let features: [Feature] = [
        Feature(label: "Recipes", free: "Up to 50", pro: "Unlimited"),
        Feature(label: "Collections", free: "Up to 10", pro: "Unlimited"),
        Feature(label: "Prep lists", free: "Up to 10", pro: "Unlimited"),
        Feature(label: "Cloud backup", free: "✓", pro: "✓"),
        Feature(label: "Priority support", free: "—", pro: "✓"),
    ]

    private var isPro: Bool { rc.isPro }

    var body: some View {
        VStack(spacing: 0) {
            SLSubHeader(title: "Subscription") { dismiss() }
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    planCard
                    comparisonCard
                    upgradeSection
                }
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 16)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
        .task {
            await rc.loadOfferings()
            if selected == nil { selected = rc.annual ?? rc.monthly }
        }
    }

    // MARK: - Plan card (Pro gradient, mirrors the Settings hub card)

    private var planCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                (Text("ChefVault ").foregroundStyle(SL.text)
                    + Text(isPro ? "Pro" : "Free").foregroundStyle(SL.accent))
                    .font(SL.display(17, .heavy))
                Spacer(minLength: 0)
                if isPro {
                    Text("ACTIVE")
                        .font(SL.mono(9.5, .bold)).tracking(0.5)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(SL.good, in: Capsule())
                }
            }
            Text(isPro
                ? "You have access to every feature."
                : "Upgrade to unlock unlimited recipes, collections, and prep lists.")
                .font(SL.body(12.5))
                .foregroundStyle(SL.muted)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [SL.accent.opacity(0.22), SL.surface],
                startPoint: .topLeading, endPoint: .bottomTrailing,
            ),
            in: RoundedRectangle(cornerRadius: SL.R.md),
        )
        .overlay(
            RoundedRectangle(cornerRadius: SL.R.md)
                .strokeBorder(SL.accent.opacity(0.30), lineWidth: 1),
        )
    }

    // MARK: - Comparison list (mono Free/Pro grid, mirrors the Paywall table)

    private var comparisonCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            SLKicker("Free vs Pro")
            SLCard(pad: 0) {
                VStack(spacing: 0) {
                    HStack {
                        Text("Feature").frame(maxWidth: .infinity, alignment: .leading)
                        Text("Free").frame(width: 70, alignment: .center).foregroundStyle(SL.faint)
                        Text("Pro").frame(width: 70, alignment: .center).foregroundStyle(SL.accent)
                    }
                    .font(SL.mono(9.5, .bold))
                    .tracking(0.5)
                    .foregroundStyle(SL.faint)
                    .padding(.horizontal, 13)
                    .padding(.vertical, 11)
                    .background(SL.surface2)

                    ForEach(features) { feature in
                        SLDivider()
                        HStack {
                            Text(feature.label).font(SL.body(12.5)).foregroundStyle(SL.text)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Text(feature.free).font(SL.mono(11.5))
                                .foregroundStyle(feature.free == "—" ? SL.faint : SL.muted)
                                .frame(width: 70, alignment: .center)
                            Text(feature.pro).font(SL.mono(11.5, .bold))
                                .foregroundStyle(SL.accent)
                                .frame(width: 70, alignment: .center)
                        }
                        .padding(.horizontal, 13)
                        .padding(.vertical, 11)
                    }
                }
            }
        }
    }

    // MARK: - Upgrade (live RevenueCat offerings)

    @ViewBuilder
    private var upgradeSection: some View {
        if isPro {
            SLButton(title: "You're on Pro", full: true) {}
                .disabled(true)
                .opacity(0.5)
        } else if rc.monthly == nil && rc.annual == nil && rc.lifetime == nil {
            // Offerings not loaded yet (or RevenueCat not configured / no products).
            VStack(spacing: 9) {
                ProgressView().controlSize(.regular)
                Text(rc.offeringsLoaded ? "Plans unavailable right now." : "Loading plans…")
                    .font(SL.mono(9.5)).foregroundStyle(SL.faint)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        } else {
            VStack(spacing: 10) {
                if let annual = rc.annual { packageRow(annual) }
                if let monthly = rc.monthly { packageRow(monthly) }
                if let lifetime = rc.lifetime { packageRow(lifetime) }

                SLButton(title: "Subscribe", full: true, busy: rc.purchasing) {
                    guard let package = selected else { return }
                    Task { if await rc.purchase(package) { dismiss() } }
                }
                .disabled(selected == nil)

                Button("Restore Purchases") {
                    Task { await rc.restore() }
                }
                .font(SL.body(13))
                .foregroundStyle(SL.muted)

                if let error = rc.lastError {
                    Text(error).font(SL.body(12)).foregroundStyle(SL.danger)
                        .frame(maxWidth: .infinity, alignment: .center)
                }

                complianceFooter
            }
        }
    }

    // One selectable plan card (price + period, "best value" badge on annual).
    private func packageRow(_ package: Package) -> some View {
        let isSelected = selected?.identifier == package.identifier
        let product = package.storeProduct
        return Button {
            selected = package
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .foregroundStyle(isSelected ? SL.accent : SL.faint)
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(periodLabel(package)).font(SL.body(14, .semibold)).foregroundStyle(SL.text)
                        if package.packageType == .annual {
                            Text("BEST VALUE")
                                .font(SL.mono(8.5, .bold)).tracking(0.5)
                                .foregroundStyle(SL.onAccent)
                                .padding(.horizontal, 6).padding(.vertical, 3)
                                .background(SL.accent, in: Capsule())
                        }
                    }
                    if product.introductoryDiscount != nil {
                        Text("Includes a 7-day free trial").font(SL.mono(10)).foregroundStyle(SL.muted)
                    }
                }
                Spacer(minLength: 0)
                Text(product.localizedPriceString).font(SL.body(15, .semibold)).foregroundStyle(SL.text)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.md))
            .overlay(
                RoundedRectangle(cornerRadius: SL.R.md)
                    .strokeBorder(isSelected ? SL.accent : SL.line, lineWidth: isSelected ? 1.5 : 1),
            )
        }
        .buttonStyle(.plain)
    }

    // Apple-required disclosures: auto-renew terms + Terms/Privacy links.
    private var complianceFooter: some View {
        VStack(spacing: 6) {
            Text("Monthly and yearly plans auto-renew until cancelled in your App Store account settings (at least 24 hours before the period ends). Lifetime is a one-time purchase.")
                .font(SL.mono(9))
                .foregroundStyle(SL.faint)
                .multilineTextAlignment(.center)
            HStack(spacing: 14) {
                Button("Terms of Use") { openURL(proTermsURL) }
                Button("Privacy Policy") { openURL(proPrivacyURL) }
            }
            .font(SL.mono(9.5))
            .foregroundStyle(SL.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
    }

    private func periodLabel(_ package: Package) -> String {
        switch package.packageType {
        case .annual: return "Yearly"
        case .monthly: return "Monthly"
        case .lifetime: return "Lifetime"
        default: return package.storeProduct.localizedTitle
        }
    }
}

// Apple's standard EULA is an acceptable Terms of Use. Replace the privacy URL
// with ChefVault's real policy before submitting to App Review.
private let proTermsURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
private let proPrivacyURL = URL(string: "https://chefvault.app/privacy")!
