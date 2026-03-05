import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { Layout, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, BorderRadius, Spacing } from '@/src/constants/theme';

interface FilterChipsProps {
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}

export function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  const { colors } = useTheme();

  const handleSelect = (value: string | null) => {
    Haptics.selectionAsync();
    onSelect(value);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      <Animated.View layout={Layout.springify()}>
        <Pressable
          style={[styles.chip, !selected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
          onPress={() => handleSelect(null)}
        >
          {!selected && <Animated.View entering={ZoomIn.duration(150)} style={styles.activeIndicator} />}
          <Text style={[styles.chipText, { color: !selected ? colors.white : colors.textSecondary }]}>All Recipes</Text>
        </Pressable>
      </Animated.View>
      {options.map((option) => {
        const active = selected === option;
        return (
          <Animated.View key={option} layout={Layout.springify()}>
            <Pressable
              style={[styles.chip, active ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
              onPress={() => handleSelect(active ? null : option)}
            >
              {active && <Animated.View entering={ZoomIn.duration(150)} style={styles.activeIndicator} />}
              <Text style={[styles.chipText, { color: active ? colors.white : colors.textSecondary }]}>{option}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.sm },
  activeIndicator: { ...StyleSheet.absoluteFillObject, borderRadius: BorderRadius.md },
});
