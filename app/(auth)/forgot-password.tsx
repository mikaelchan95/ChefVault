import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import ReAnimated, { FadeIn } from 'react-native-reanimated';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { FontSize, Spacing, BorderRadius, type ColorPalette } from '@/src/constants/theme';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetPassword, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setError(null);
    const { error: resetError } = await resetPassword(email);
    if (resetError) {
      setError(resetError);
    } else {
      setSent(true);
    }
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {sent ? (
          <View style={styles.successContainer}>
            <View
              style={[
                styles.successIconWrapper,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <MaterialIcons
                name="check-circle"
                size={48}
                color={colors.success}
              />
            </View>
            <Text style={[styles.successHeading, { color: colors.text }]}>
              Check Your Email
            </Text>
            <Text style={[styles.successDescription, { color: colors.textSecondary }]}>
              We've sent a password reset link to{' '}
              <Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
                {email}
              </Text>
              . Check your inbox and follow the instructions to reset your password.
            </Text>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                  BACK TO SIGN IN
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <>
            <View style={styles.headerSection}>
              <Text style={[styles.heading, { color: colors.text }]}>
                Reset Password
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Enter the email address associated with your account and we'll send
                you a link to reset your password.
              </Text>
            </View>

            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.field, borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="email"
                size={20}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            {error && (
              <ReAnimated.View
                entering={FadeIn.duration(200)}
                style={[
                  styles.errorContainer,
                  { backgroundColor: colors.errorLight },
                ]}
              >
                <MaterialIcons
                  name="error-outline"
                  size={16}
                  color={colors.error}
                />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
              </ReAnimated.View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleReset}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                  SEND RESET LINK
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={[styles.footerLink, { color: colors.primary }]}>
                    Back to Sign In
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xxl,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    headerSection: {
      marginBottom: Spacing.xxl,
    },
    heading: {
      fontSize: FontSize.xxl,
      fontFamily: 'Inter_700Bold',
    },
    description: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_400Regular',
      marginTop: Spacing.sm,
      lineHeight: 22,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      height: 52,
      marginBottom: Spacing.md,
    },
    inputIcon: {
      marginRight: Spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: FontSize.base,
      fontFamily: 'Inter_400Regular',
      height: '100%',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    errorText: {
      fontSize: FontSize.sm,
      fontFamily: 'Inter_500Medium',
      flex: 1,
    },
    primaryButton: {
      height: 52,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.sm,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontSize: FontSize.base,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1,
    },
    footer: {
      alignItems: 'center',
      marginTop: Spacing.xxl,
    },
    footerLink: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_600SemiBold',
    },
    successContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xxxl,
    },
    successIconWrapper: {
      width: 88,
      height: 88,
      borderRadius: BorderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xxl,
    },
    successHeading: {
      fontSize: FontSize.xxl,
      fontFamily: 'Inter_700Bold',
      marginBottom: Spacing.md,
    },
    successDescription: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: Spacing.xxxl,
      paddingHorizontal: Spacing.lg,
    },
  });
