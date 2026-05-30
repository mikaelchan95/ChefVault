import SwiftUI
import ChefVaultShared

/// Read-only plan card + Free-vs-Pro comparison. Billing is a stub: ProfileUpdate has no
/// plan field, so the upgrade button is disabled and we never mutate the plan here.
/// Service Line dark sub-screen: hidden system nav bar + SLSubHeader over SLBackground.
struct SubscriptionView: View {
    @Bindable var vm: SettingsViewModel
    @Environment(\.dismiss) private var dismiss

    private struct Feature: Identifiable {
        let id = UUID()
        let label: String
        let free: String
        let pro: String
    }

    private let features: [Feature] = [
        Feature(label: "Recipes", free: "Up to 50", pro: "Unlimited"),
        Feature(label: "Collections", free: "Unlimited", pro: "Unlimited"),
        Feature(label: "Prep lists", free: "Unlimited", pro: "Unlimited"),
        Feature(label: "Cloud backup", free: "✓", pro: "✓"),
        Feature(label: "Priority support", free: "—", pro: "✓"),
    ]

    private var isPro: Bool { vm.profile?.plan == .pro }

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
                        .foregroundStyle(SL.onAccent)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(SL.accent, in: Capsule())
                }
            }
            Text(isPro
                ? "You have access to every feature."
                : "Upgrade to unlock unlimited recipes and priority support.")
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

    // MARK: - Upgrade (billing stub)

    private var upgradeSection: some View {
        VStack(spacing: 9) {
            SLButton(title: isPro ? "You're on Pro" : "Upgrade to Pro", full: true) {}
                .disabled(true)
                .opacity(0.5)
            Text("PAYMENT INTEGRATION COMING SOON")
                .font(SL.mono(9.5))
                .foregroundStyle(SL.faint)
                .frame(maxWidth: .infinity)
        }
    }
}
