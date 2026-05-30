import SwiftUI
import ChefVaultShared

/// Two large selectable cards (Metric / Imperial) that write straight back to the profile.
struct UnitsView: View {
    @Bindable var vm: SettingsViewModel

    private var current: MeasurementSystem { vm.profile?.defaultUnits ?? .metric }

    var body: some View {
        ScrollView {
            VStack(spacing: CV.Spacing.lg) {
                unitCard(
                    system: .metric,
                    icon: "scalemass",
                    title: "Metric",
                    description: "Grams, kilograms, millilitres, litres.",
                )
                unitCard(
                    system: .imperial,
                    icon: "ruler",
                    title: "Imperial",
                    description: "Ounces, pounds, cups, tablespoons.",
                )
                CVErrorLabel(message: vm.errorMessage)
            }
            .padding(CV.Spacing.lg)
        }
        .navigationTitle("Default Units")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func unitCard(
        system: MeasurementSystem, icon: String, title: String, description: String,
    ) -> some View {
        let selected = current == system
        return Button {
            Task {
                await vm.update(.change(defaultUnits: system))
            }
        } label: {
            HStack(spacing: CV.Spacing.lg) {
                Image(systemName: icon)
                    .font(.title2)
                    .frame(width: 44, height: 44)
                    .background(selected ? CV.primary : CV.primaryTint, in: RoundedRectangle(cornerRadius: CV.Radius.md))
                    .foregroundStyle(selected ? .white : CV.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.headline).foregroundStyle(.primary)
                    Text(description).font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                if selected {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(CV.primary)
                }
            }
            .padding(CV.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: CV.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: CV.Radius.lg)
                    .strokeBorder(selected ? CV.primary : Color(.separator).opacity(0.5), lineWidth: selected ? 1.5 : 0.5),
            )
        }
        .buttonStyle(.plain)
    }
}
