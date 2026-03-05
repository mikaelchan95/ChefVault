import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { useAuthStore } from '@/src/stores/authStore';
import { SettingsGroup } from '@/src/components/settings/SettingsGroup';
import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { ToggleRow } from '@/src/components/settings/ToggleRow';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
  zh: '中文',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, setDark, sharedStyles } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const displayName = profile?.name ?? 'Chef';
  const displayTitle = profile?.title ?? '';
  const displayEmail = profile?.email ?? '';
  const displayPlan = profile?.plan ?? 'free';
  const unitsLabel = profile?.default_units === 'imperial' ? 'Imperial' : 'Metric';
  const languageLabel = LANGUAGE_NAMES[profile?.language ?? 'en'] ?? 'English';
  const backupEnabled = profile?.auto_backup ?? true;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { borderColor: colors.primary, backgroundColor: colors.card }]}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <MaterialIcons name="person" size={36} color={colors.primary} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.profileTitle, { color: colors.textTertiary }]}>{displayTitle}</Text>
            <Text style={[styles.profileEmail, { color: colors.primary }]}>{displayEmail}</Text>
          </View>
        </View>

        <View style={styles.ctaContainer}>
          <View style={sharedStyles.card}>
            <View style={[styles.ctaBanner, { backgroundColor: colors.primaryLight }]}>
              <View style={[styles.ctaBannerOverlay, { backgroundColor: colors.overlay }]} />
              <MaterialIcons name="verified" size={48} color={colors.primaryMuted} style={styles.ctaBannerIcon} />
            </View>
            <View style={styles.ctaContent}>
              <View style={styles.ctaTitleRow}>
                <Text style={[styles.ctaTitle, { color: colors.text }]}>ChefVault Pro</Text>
                <View style={[styles.eliteBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.eliteBadgeText, { color: colors.primary }]}>
                    {displayPlan === 'pro' ? 'Active' : 'Free'}
                  </Text>
                </View>
              </View>
              <View style={styles.featureList}>
                <View style={styles.featureRow}>
                  <MaterialIcons name="all-inclusive" size={18} color={colors.success} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Unlimited Recipes</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialIcons name="attach-money" size={18} color={colors.success} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Ingredient Costing</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialIcons name="groups" size={18} color={colors.textMuted} />
                  <Text style={[styles.featureText, { color: colors.textMuted }]}>Team Sync (Coming Soon)</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <SettingsGroup label="Account & Security">
          <SettingsRow icon="person-outline" title="Profile Information" onPress={() => router.push('/settings/profile')} />
          <SettingsRow icon="credit-card" title="Subscription & Billing" onPress={() => router.push('/settings/subscription')} />
          <SettingsRow icon="lock-outline" title="Security & Password" onPress={() => router.push('/settings/security')} isLast />
        </SettingsGroup>

        <View style={styles.sectionGap} />
        <SettingsGroup label="App Preferences">
          <ToggleRow icon="dark-mode" iconColor={colors.primary} title="Dark Mode" value={isDark} onToggle={setDark} />
          <SettingsRow icon="straighten" title="Default Units" value={unitsLabel} onPress={() => router.push('/settings/units')} />
          <SettingsRow
            icon="cloud-upload"
            title="Data Backup"
            value={backupEnabled ? 'Auto-sync ON' : 'Auto-sync OFF'}
            valueColor={backupEnabled ? colors.success : colors.textMuted}
            onPress={() => router.push('/settings/data-backup')}
          />
          <SettingsRow icon="translate" title="Language" value={languageLabel} onPress={() => router.push('/settings/language')} isLast />
        </SettingsGroup>

        <View style={styles.sectionGap} />
        <SettingsGroup label="About">
          <SettingsRow icon="info-outline" title="Version" value="0.1.0 (MVP)" showChevron={false} isLast />
        </SettingsGroup>

        <View style={styles.logoutSection}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              { borderColor: colors.errorBorder, backgroundColor: colors.errorLight },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
          </Pressable>
          <Text style={[styles.versionFooter, { color: colors.textMuted }]}>ChefVault v0.1.0 (Build 1)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 68, height: 68, borderRadius: 34 },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xl, letterSpacing: -0.3 },
  profileTitle: { fontFamily: 'Inter_400Regular', fontSize: FontSize.md, marginTop: 2 },
  profileEmail: { fontFamily: 'Inter_500Medium', fontSize: FontSize.md, marginTop: 2 },
  ctaContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  ctaBanner: { height: 80, overflow: 'hidden' },
  ctaBannerOverlay: { ...StyleSheet.absoluteFillObject },
  ctaBannerIcon: { position: 'absolute', right: 16, top: 12 },
  ctaContent: { padding: Spacing.lg, gap: Spacing.md },
  ctaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ctaTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.lg },
  eliteBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  eliteBadgeText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, textTransform: 'uppercase' },
  featureList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  sectionGap: { height: Spacing.xxl },
  logoutSection: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingBottom: Spacing.xxl, gap: Spacing.xxl },
  logoutButton: { paddingHorizontal: Spacing.xxxl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: StyleSheet.hairlineWidth },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md },
  versionFooter: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 3 },
});
