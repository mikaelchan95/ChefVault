import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { SettingsGroup } from '@/src/components/settings/SettingsGroup';
import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

interface PlanFeature {
  label: string;
  free: boolean;
  pro: boolean;
}

const PLAN_FEATURES: PlanFeature[] = [
  { label: '50 Recipes', free: true, pro: false },
  { label: 'Unlimited Recipes', free: false, pro: true },
  { label: 'Basic Search', free: true, pro: true },
  { label: 'Ingredient Costing', free: false, pro: true },
  { label: '3 Collections', free: true, pro: false },
  { label: 'Unlimited Collections', free: false, pro: true },
  { label: 'Prep Lists', free: false, pro: true },
  { label: 'Data Export', free: false, pro: true },
  { label: 'Priority Support', free: false, pro: true },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const isPro = profile?.plan === 'pro';

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={sharedStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={sharedStyles.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.planCardContainer}>
          <View
            style={[
              styles.planCard,
              {
                backgroundColor: isPro ? colors.primaryLight : colors.card,
                borderColor: isPro ? colors.primaryBorder : colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planName, { color: colors.text }]}>
                  ChefVault {isPro ? 'Pro' : 'Free'}
                </Text>
                <Text
                  style={[styles.planSubtitle, { color: colors.textSecondary }]}
                >
                  {isPro
                    ? 'Full access to all features'
                    : 'Basic recipe management'}
                </Text>
              </View>
              <View
                style={[
                  styles.activeBadge,
                  {
                    backgroundColor: isPro
                      ? colors.primary
                      : colors.textTertiary,
                  },
                ]}
              >
                <Text style={[styles.activeBadgeText, { color: colors.white }]}>
                  Active
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.comparisonContainer}>
          <Text style={[styles.comparisonTitle, { color: colors.textMuted }]}>
            PLAN COMPARISON
          </Text>

          <View style={styles.comparisonHeader}>
            <View style={styles.featureLabelCol} />
            <Text style={[styles.colHeader, { color: colors.textSecondary }]}>
              Free
            </Text>
            <Text style={[styles.colHeader, { color: colors.primary }]}>
              Pro
            </Text>
          </View>

          <View
            style={[
              sharedStyles.card,
              { marginHorizontal: Spacing.lg },
            ]}
          >
            {PLAN_FEATURES.map((feature, idx) => (
              <View key={feature.label}>
                <View style={styles.featureRow}>
                  <Text
                    style={[
                      styles.featureLabel,
                      { color: colors.text },
                    ]}
                  >
                    {feature.label}
                  </Text>
                  <View style={styles.featureIconCol}>
                    <MaterialIcons
                      name={feature.free ? 'check-circle' : 'cancel'}
                      size={18}
                      color={feature.free ? colors.success : colors.textMuted}
                    />
                  </View>
                  <View style={styles.featureIconCol}>
                    <MaterialIcons
                      name={feature.pro ? 'check-circle' : 'cancel'}
                      size={18}
                      color={feature.pro ? colors.success : colors.textMuted}
                    />
                  </View>
                </View>
                {idx < PLAN_FEATURES.length - 1 && (
                  <View
                    style={[
                      styles.featureDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionGap} />

        <SettingsGroup label="Billing">
          <SettingsRow
            icon="event"
            title="Next Billing Date"
            value={isPro ? 'Apr 5, 2026' : '—'}
            showChevron={false}
          />
          <SettingsRow
            icon="credit-card"
            title="Payment Method"
            value={isPro ? '•••• 4242' : 'None'}
            showChevron={false}
            isLast
          />
        </SettingsGroup>

        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              isPro ? styles.outlinedButton : sharedStyles.primaryButton,
              isPro && { borderColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                isPro
                  ? [styles.outlinedButtonText, { color: colors.primary }]
                  : sharedStyles.primaryButtonText,
              ]}
            >
              {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  planCardContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  planCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xl,
  },
  planSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  activeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  activeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  comparisonContainer: {
    paddingTop: Spacing.xxxl,
    gap: Spacing.md,
  },
  comparisonTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 1.5,
    paddingHorizontal: Spacing.lg + Spacing.xs,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  featureLabelCol: {
    flex: 1,
  },
  colHeader: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
    width: 52,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  featureLabel: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.md,
  },
  featureIconCol: {
    width: 52,
    alignItems: 'center',
  },
  featureDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg,
  },
  sectionGap: {
    height: Spacing.xxl,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
  },
  outlinedButton: {
    borderWidth: 1.5,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
