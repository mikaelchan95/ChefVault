import SwiftUI
import ChefVaultShared

/// Two large selectable cards (Metric / Imperial) that write straight back to the profile.
/// Service Line sub-screen: hidden system nav bar, SLSubHeader at top, ember background.
struct UnitsView: View {
    @Bindable var vm: SettingsViewModel
    @Environment(\.dismiss) private var dismiss

    private var current: MeasurementSystem { vm.profile?.defaultUnits ?? .metric }

    var body: some View {
        VStack(spacing: 0) {
            SLSubHeader(title: "Default Units", back: "Settings") { dismiss() }
            ScrollView {
                VStack(alignment: .leading, spacing: 11) {
                    SLKicker("Measurement system").padding(.horizontal, 4)
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
                    if let message = vm.errorMessage {
                        Text(message).font(SL.body(12.5)).foregroundStyle(SL.danger)
                    }
                }
                .padding(.horizontal, SL.Pad.screen)
                .padding(.top, 18)
                .padding(.bottom, 40)
            }
        }
        .background(SLBackground())
        .toolbar(.hidden, for: .navigationBar)
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
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .semibold))
                    .frame(width: 48, height: 48)
                    .foregroundStyle(selected ? SL.onAccent : SL.accent)
                    .background(selected ? SL.accent : SL.accentSoft, in: RoundedRectangle(cornerRadius: SL.R.sm))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(SL.display(17, .bold)).foregroundStyle(SL.text)
                    Text(description).font(SL.body(12.5)).foregroundStyle(SL.muted)
                }
                Spacer(minLength: 0)
                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(SL.accent)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SL.surface, in: RoundedRectangle(cornerRadius: SL.R.lg))
            .overlay(
                RoundedRectangle(cornerRadius: SL.R.lg)
                    .strokeBorder(selected ? SL.accent : SL.line, lineWidth: selected ? 1.5 : 1),
            )
        }
        .buttonStyle(.plain)
    }
}
