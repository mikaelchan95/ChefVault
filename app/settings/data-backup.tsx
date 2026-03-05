import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { SettingsGroup } from '@/src/components/settings/SettingsGroup';
import { ToggleRow } from '@/src/components/settings/ToggleRow';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

export default function DataBackupScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const autoBackup = profile?.auto_backup ?? true;

  const handleToggleBackup = (value: boolean) => {
    useAuthStore.getState().updateProfile({ auto_backup: value });
  };

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={sharedStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={sharedStyles.headerTitle}>Data Backup</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.topSection}>
          <SettingsGroup label="Automatic Backup">
            <ToggleRow
              icon="cloud-upload"
              iconColor={colors.primary}
              title="Auto-Backup"
              value={autoBackup}
              onToggle={handleToggleBackup}
              isLast
            />
          </SettingsGroup>
        </View>

        <View style={styles.infoCardContainer}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <MaterialIcons
              name="history"
              size={20}
              color={colors.textTertiary}
            />
            <View style={styles.infoTextGroup}>
              <Text
                style={[styles.infoLabel, { color: colors.textSecondary }]}
              >
                Last Backup
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                Never
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Pressable
            style={({ pressed }) => [
              sharedStyles.primaryButton,
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialIcons name="backup" size={20} color={colors.white} />
            <Text style={sharedStyles.primaryButtonText}>Backup Now</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.outlinedButton,
              { borderColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialIcons
              name="file-download"
              size={20}
              color={colors.primary}
            />
            <Text
              style={[styles.outlinedButtonText, { color: colors.primary }]}
            >
              Export All Data
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.outlinedButton,
              { borderColor: colors.border, opacity: 0.5 },
            ]}
            disabled
          >
            <MaterialIcons
              name="file-upload"
              size={20}
              color={colors.textMuted}
            />
            <Text
              style={[styles.outlinedButtonText, { color: colors.textMuted }]}
            >
              Import Data
            </Text>
          </Pressable>
        </View>

        <View style={styles.footerContainer}>
          <MaterialIcons name="lock" size={14} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Backups are encrypted and stored securely
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topSection: {
    paddingTop: Spacing.xxl,
  },
  infoCardContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoTextGroup: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.sm,
  },
  infoValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.base,
  },
  actionsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    gap: Spacing.md,
  },
  outlinedButton: {
    borderWidth: 1.5,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  outlinedButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
  },
});
