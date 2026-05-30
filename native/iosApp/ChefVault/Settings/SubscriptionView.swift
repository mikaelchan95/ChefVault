import SwiftUI
import ChefVaultShared

/// Read-only plan card + Free-vs-Pro comparison. Billing is a stub: ProfileUpdate has no
/// plan field, so the upgrade button is disabled and we never mutate the plan here.
struct SubscriptionView: View {
    @Bindable var vm: SettingsViewModel

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
        ScrollView {
            VStack(spacing: CV.Spacing.xl) {
                planCard
                comparisonCard
                upgradeSection
            }
            .padding(CV.Spacing.lg)
        }
        .navigationTitle("Subscription")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var planCard: some View {
        CVCard {
            VStack(alignment: .leading, spacing: CV.Spacing.sm) {
                CVSectionHeader(title: "Current Plan")
                HStack {
                    Text(isPro ? "Pro" : "Free")
                        .font(.title.bold())
                        .foregroundStyle(isPro ? CV.primary : .primary)
                    if isPro {
                        Image(systemName: "crown.fill").foregroundStyle(CV.primary)
                    }
                }
                Text(isPro ? "You have access to every feature." : "Upgrade to unlock unlimited recipes and priority support.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var comparisonCard: some View {
        CVCard {
            VStack(alignment: .leading, spacing: CV.Spacing.md) {
                CVSectionHeader(title: "Free vs Pro")
                HStack {
                    Text("Feature").font(.caption.bold()).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text("Free").font(.caption.bold()).foregroundStyle(.secondary)
                        .frame(width: 80, alignment: .center)
                    Text("Pro").font(.caption.bold()).foregroundStyle(CV.primary)
                        .frame(width: 80, alignment: .center)
                }
                ForEach(features) { feature in
                    Divider()
                    HStack {
                        Text(feature.label).font(.subheadline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(feature.free).font(.subheadline).foregroundStyle(.secondary)
                            .frame(width: 80, alignment: .center)
                        Text(feature.pro).font(.subheadline.weight(.medium)).foregroundStyle(CV.primary)
                            .frame(width: 80, alignment: .center)
                    }
                }
            }
        }
    }

    private var upgradeSection: some View {
        VStack(spacing: CV.Spacing.sm) {
            Label("Payment integration coming soon", systemImage: "info.circle")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
            CVPrimaryButton(title: isPro ? "You're on Pro" : "Upgrade to Pro") {}
                .disabled(true)
                .opacity(0.5)
        }
    }
}
