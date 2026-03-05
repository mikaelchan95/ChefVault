import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

interface UnitOption {
  value: 'metric' | 'imperial';
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const UNIT_OPTIONS: UnitOption[] = [
  {
    value: 'metric',
    title: 'Metric',
    description: 'Grams, Kilograms, Milliliters, Liters, Celsius',
    icon: 'straighten',
  },
  {
    value: 'imperial',
    title: 'Imperial',
    description: 'Ounces, Pounds, Cups, Fluid Ounces, Fahrenheit',
    icon: 'square-foot',
  },
];

export default function UnitsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const currentUnits = profile?.default_units ?? 'metric';

  const handleSelect = (value: 'metric' | 'imperial') => {
    useAuthStore.getState().updateProfile({ default_units: value });
  };

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={sharedStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={sharedStyles.headerTitle}>Default Units</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.container}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            UNIT SYSTEM
          </Text>

          <View style={styles.cardsContainer}>
            {UNIT_OPTIONS.map((option) => {
              const selected = currentUnits === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.unitCard,
                    {
                      backgroundColor: selected
                        ? colors.primaryLight
                        : colors.card,
                      borderColor: selected
                        ? colors.primaryBorder
                        : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={option.icon}
                        size={24}
                        color={selected ? colors.white : colors.textTertiary}
                      />
                    </View>
                    {selected && (
                      <MaterialIcons
                        name="check-circle"
                        size={22}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: selected ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={[
                      styles.cardDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    gap: Spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 1.5,
    marginLeft: Spacing.xs,
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  unitCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.lg,
  },
  cardDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.md,
    lineHeight: 20,
  },
});
