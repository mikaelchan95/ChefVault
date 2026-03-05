import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { SettingsGroup } from '@/src/components/settings/SettingsGroup';
import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

type PasswordStrength = 'weak' | 'fair' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (password.length >= 12 && score >= 3) return 'strong';
  if (password.length >= 8 && score >= 2) return 'fair';
  return 'weak';
}

const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; flex: number }> = {
  weak: { label: 'Weak', flex: 0.33 },
  fair: { label: 'Fair', flex: 0.66 },
  strong: { label: 'Strong', flex: 1 },
};

const LINKED_ACCOUNTS: { name: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { name: 'Google', icon: 'account-circle' },
  { name: 'Facebook', icon: 'facebook' },
];

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const strengthColor =
    strength === 'strong'
      ? colors.success
      : strength === 'fair'
        ? colors.warning
        : colors.error;

  const validate = (): string | null => {
    if (!currentPassword) return 'Current password is required';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    if (newPassword === currentPassword) return 'New password must differ from current';
    if (newPassword !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleUpdatePassword = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: apiError } = await useAuthStore
      .getState()
      .updatePassword(newPassword);
    setSubmitting(false);
    if (apiError) {
      setError(apiError);
    } else {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => useAuthStore.getState().deleteAccount(),
        },
      ],
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.field,
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={sharedStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={sharedStyles.headerTitle}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <SettingsGroup label="Change Password">
          <View style={styles.form}>
            <TextInput
              style={inputStyle}
              value={currentPassword}
              onChangeText={(t) => {
                setCurrentPassword(t);
                setError(null);
              }}
              placeholder="Current Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.fieldWithIndicator}>
              <TextInput
                style={inputStyle}
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  setError(null);
                }}
                placeholder="New Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
              {newPassword.length > 0 && (
                <View style={styles.strengthRow}>
                  <View
                    style={[
                      styles.strengthTrack,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          backgroundColor: strengthColor,
                          flex: STRENGTH_CONFIG[strength].flex,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.strengthLabel, { color: strengthColor }]}
                  >
                    {STRENGTH_CONFIG[strength].label}
                  </Text>
                </View>
              )}
            </View>

            <TextInput
              style={inputStyle}
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setError(null);
              }}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />

            {error && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.errorLight,
                    borderColor: colors.errorBorder,
                  },
                ]}
              >
                <MaterialIcons name="error-outline" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
              </View>
            )}

            {success && (
              <View
                style={[
                  styles.successBox,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primaryBorder,
                  },
                ]}
              >
                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                <Text style={[styles.successText, { color: colors.success }]}>
                  Password updated successfully
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                sharedStyles.primaryButton,
                pressed && { opacity: 0.85 },
                submitting && { opacity: 0.6 },
              ]}
              onPress={handleUpdatePassword}
              disabled={submitting}
            >
              <Text style={sharedStyles.primaryButtonText}>
                {submitting ? 'Updating…' : 'Update Password'}
              </Text>
            </Pressable>
          </View>
        </SettingsGroup>

        <View style={styles.sectionGap} />

        <SettingsGroup label="Linked Accounts">
          <View>
            {LINKED_ACCOUNTS.map((account, idx) => (
              <SettingsRow
                key={account.name}
                icon={account.icon}
                title={account.name}
                showChevron={false}
                isLast={idx === LINKED_ACCOUNTS.length - 1}
                trailing={
                  <View
                    style={[
                      styles.linkedBadge,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[styles.linkedText, { color: colors.textMuted }]}
                    >
                      Not Linked
                    </Text>
                  </View>
                }
              />
            ))}
          </View>
        </SettingsGroup>

        <View style={styles.sectionGap} />

        <SettingsGroup label="Danger Zone">
          <SettingsRow
            icon="delete-forever"
            title="Delete Account"
            valueColor={colors.error}
            onPress={handleDeleteAccount}
            showChevron
            isLast
          />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  input: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.base,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
  },
  fieldWithIndicator: {
    gap: Spacing.sm,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  strengthFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.xs,
    width: 44,
    textAlign: 'right',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.sm,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  successText: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.sm,
    flex: 1,
  },
  linkedBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  linkedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.xs,
  },
  sectionGap: {
    height: Spacing.xxl,
  },
});
