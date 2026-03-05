import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

interface LanguageOption {
  code: string;
  flag: string;
  name: string;
  native: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', flag: '🇺🇸', name: 'English', native: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish', native: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'French', native: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'German', native: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', name: 'Italian', native: 'Italiano' },
  { code: 'pt', flag: '🇧🇷', name: 'Portuguese', native: 'Português' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese', native: '日本語' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese', native: '中文' },
];

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const currentLang = profile?.language ?? 'en';

  const handleSelect = (code: string) => {
    useAuthStore.getState().updateProfile({ language: code });
    router.back();
  };

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={sharedStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={sharedStyles.headerTitle}>Language</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.listContainer}>
          <View
            style={[
              sharedStyles.card,
              { marginHorizontal: Spacing.lg },
            ]}
          >
            {LANGUAGES.map((lang, idx) => {
              const selected = currentLang === lang.code;
              return (
                <View key={lang.code}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.langRow,
                      pressed && { backgroundColor: colors.borderSubtle },
                    ]}
                    onPress={() => handleSelect(lang.code)}
                  >
                    <Text style={styles.flag}>{lang.flag}</Text>
                    <View style={styles.langText}>
                      <Text style={[styles.langName, { color: colors.text }]}>
                        {lang.name}
                      </Text>
                      <Text
                        style={[
                          styles.langNative,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {lang.native}
                      </Text>
                    </View>
                    {selected && (
                      <MaterialIcons
                        name="check"
                        size={22}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                  {idx < LANGUAGES.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: Spacing.xxl,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  flag: {
    fontSize: 24,
  },
  langText: {
    flex: 1,
    gap: 2,
  },
  langName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.base,
  },
  langNative: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
});
