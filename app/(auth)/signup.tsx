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
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { FontSize, Spacing, BorderRadius, type ColorPalette } from '@/src/constants/theme';

type PasswordStrength = 'weak' | 'fair' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 3 && password.length >= 10) return 'strong';
  if (score >= 2) return 'fair';
  return 'weak';
}

export default function SignUpScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUpWithEmail, signInWithProvider, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;

  const strengthConfig: Record<PasswordStrength, { label: string; color: string }> = {
    weak: { label: 'Weak', color: colors.error },
    fair: { label: 'Fair', color: '#F59E0B' },
    strong: { label: 'Strong', color: colors.success },
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Full name is required';
    if (!email.trim()) return 'Email is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const { error: signUpError, needsConfirmation } = await signUpWithEmail(email, password, name);
    if (signUpError) {
      setError(signUpError);
    } else if (needsConfirmation) {
      setShowConfirmation(true);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    setError(null);
    const { error: socialError } = await signInWithProvider(provider);
    if (socialError) {
      setError(socialError);
    }
  };

  const styles = createStyles(colors);

  if (showConfirmation) {
    return (
      <View style={[styles.container, styles.confirmationContainer, { paddingTop: insets.top }]}>
        <View style={[styles.confirmationIcon, { backgroundColor: colors.successLight ?? colors.primary + '15' }]}>
          <MaterialIcons name="mark-email-read" size={48} color={colors.success ?? colors.primary} />
        </View>
        <Text style={[styles.confirmationTitle, { color: colors.text }]}>
          Check Your Email
        </Text>
        <Text style={[styles.confirmationText, { color: colors.textSecondary }]}>
          We sent a confirmation link to{'\n'}
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.text }}>{email}</Text>
        </Text>
        <Text style={[styles.confirmationHint, { color: colors.textMuted }]}>
          Click the link in the email to activate your account, then come back here to sign in.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: Spacing.xxl }]}
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: colors.white }]}>
            GO TO SIGN IN
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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

        <View style={styles.headerSection}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join thousands of professional chefs
          </Text>
        </View>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.field, borderColor: colors.border },
          ]}
        >
          <MaterialIcons
            name="person"
            size={20}
            color={colors.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Full Name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            editable={!isLoading}
          />
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

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.field, borderColor: colors.border },
          ]}
        >
          <MaterialIcons
            name="lock"
            size={20}
            color={colors.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {passwordStrength && (
          <View style={styles.strengthRow}>
            <View style={styles.strengthBarTrack}>
              {(['weak', 'fair', 'strong'] as const).map((level, i) => (
                <View
                  key={level}
                  style={[
                    styles.strengthBarSegment,
                    {
                      backgroundColor:
                        i <=
                        ['weak', 'fair', 'strong'].indexOf(passwordStrength)
                          ? strengthConfig[passwordStrength].color
                          : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              style={[
                styles.strengthLabel,
                { color: strengthConfig[passwordStrength].color },
              ]}
            >
              {strengthConfig[passwordStrength].label}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.field, borderColor: colors.border },
          ]}
        >
          <MaterialIcons
            name="lock-outline"
            size={20}
            color={colors.textTertiary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Confirm Password"
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={showConfirmPassword ? 'visibility' : 'visibility-off'}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {error && (
          <ReAnimated.View
            entering={FadeIn.duration(200)}
            style={[
              styles.errorContainer,
              { backgroundColor: colors.errorLight },
            ]}
          >
            <MaterialIcons name="error-outline" size={16} color={colors.error} />
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
          onPress={handleSignUp}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>
              CREATE ACCOUNT
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>
            or continue with
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity
            style={[
              styles.socialButton,
              { backgroundColor: colors.white, borderColor: colors.border },
            ]}
            onPress={() => handleSocialSignIn('google')}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#1A1A1A" />
            <Text style={styles.socialButtonTextDark}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.facebookButton]}
            onPress={() => handleSocialSignIn('facebook')}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />
            <Text style={styles.socialButtonTextLight}>Facebook</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
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
    confirmationContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xxl,
    },
    confirmationIcon: {
      width: 96,
      height: 96,
      borderRadius: BorderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xxl,
    },
    confirmationTitle: {
      fontSize: FontSize.xxl,
      fontFamily: 'Inter_700Bold',
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    confirmationText: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      lineHeight: 24,
    },
    confirmationHint: {
      fontSize: FontSize.sm,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      lineHeight: 20,
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
    subtitle: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_400Regular',
      marginTop: Spacing.xs,
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
    strengthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
      marginTop: -Spacing.xs,
      gap: Spacing.sm,
    },
    strengthBarTrack: {
      flexDirection: 'row',
      flex: 1,
      gap: Spacing.xs,
    },
    strengthBarSegment: {
      flex: 1,
      height: 3,
      borderRadius: BorderRadius.full,
    },
    strengthLabel: {
      fontSize: FontSize.xs,
      fontFamily: 'Inter_600SemiBold',
      minWidth: 40,
      textAlign: 'right',
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
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: Spacing.xxl,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontSize: FontSize.sm,
      fontFamily: 'Inter_400Regular',
      marginHorizontal: Spacing.lg,
    },
    socialRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    socialButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      gap: Spacing.sm,
    },
    facebookButton: {
      backgroundColor: '#1877F2',
      borderColor: '#1877F2',
    },
    socialButtonTextDark: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_600SemiBold',
      color: '#1A1A1A',
    },
    socialButtonTextLight: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_600SemiBold',
      color: '#FFFFFF',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Spacing.xxxl,
    },
    footerText: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_400Regular',
    },
    footerLink: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_600SemiBold',
    },
  });
