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

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithEmail, signInWithProvider, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    setError(null);
    const { error: signInError } = await signInWithEmail(email.trim(), password);
    if (signInError) {
      setError(signInError);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandSection}>
          <Text style={[styles.brandName, { color: colors.primary }]}>
            ChefVault
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Professional Recipe Management
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.heading, { color: colors.text }]}>Sign In</Text>

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
              autoComplete="password"
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
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                SIGN IN
              </Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotPassword}>
              <Text
                style={[styles.forgotPasswordText, { color: colors.primary }]}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </Link>

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
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Sign Up
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
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xxl,
    },
    brandSection: {
      alignItems: 'center',
      marginBottom: Spacing.xxxl + Spacing.lg,
    },
    brandName: {
      fontSize: FontSize.xxxl,
      fontFamily: 'Inter_700Bold',
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_400Regular',
      marginTop: Spacing.xs,
    },
    formSection: {
      flex: 1,
    },
    heading: {
      fontSize: FontSize.xxl,
      fontFamily: 'Inter_700Bold',
      marginBottom: Spacing.xxl,
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
    forgotPassword: {
      alignSelf: 'flex-end',
      marginTop: Spacing.md,
    },
    forgotPasswordText: {
      fontSize: FontSize.md,
      fontFamily: 'Inter_500Medium',
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
