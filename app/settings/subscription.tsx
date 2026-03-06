import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useToastStore } from '@/src/stores/toastStore';
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
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [updating, setUpdating] = useState(false);

  const isPro = profile?.plan === 'pro';

  const handleUpgrade = () => {
    Alert.alert('Upgrade to Pro', 'This will upgrade your account to the Pro plan.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Upgrade',
        onPress: async () => {
          setUpdating(true);
          try {
            updateProfile({ plan: 'pro' });
            useToastStore.getState().show({ message: 'Upgraded to Pro!', type: 'success' });
          } catch {
            useToastStore.getState().show({ message: 'Upgrade failed', type: 'error' });
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const handleDowngrade = () => {
    Alert.alert('Downgrade to Free', 'You will lose access to Pro features.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Downgrade',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          try {
            updateProfile({ plan: 'free' });
            useToastStore.getState().show({ message: 'Downgraded to Free', type: 'info' });
          } catch {
            useToastStore.getState().show({ message: 'Downgrade failed', type: 'error' });
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

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

        <View style={styles.billingNote}>
          <MaterialIcons name="info-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.billingNoteText, { color: colors.textMuted }]}>
            Payment integration coming soon
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {isPro ? (
            <Pressable
              style={({ pressed }) => [
                styles.outlinedButton,
                { borderColor: colors.error },
                pressed && { opacity: 0.85 },
                updating && { opacity: 0.6 },
              ]}
              onPress={handleDowngrade}
              disabled={updating}
            >
              <Text style={[styles.outlinedButtonText, { color: colors.error }]}>
                {updating ? 'Processing…' : 'Downgrade to Free'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                sharedStyles.primaryButton,
                pressed && { opacity: 0.85 },
                updating && { opacity: 0.6 },
              ]}
              onPress={handleUpgrade}
              disabled={updating}
            >
              <Text style={sharedStyles.primaryButtonText}>
                {updating ? 'Processing…' : 'Upgrade to Pro'}
              </Text>
            </Pressable>
          )}
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
  billingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  billingNoteText: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.sm,
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
