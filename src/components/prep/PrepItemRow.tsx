import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import type { PrepItem } from '@/src/types';

export function PrepItemRow({ item, onToggle }: { item: PrepItem; onToggle: () => void }) {
  const { colors } = useTheme();

  const checkboxStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(item.checked ? colors.primary : 'transparent', { duration: 200 }),
    borderColor: withTiming(item.checked ? colors.primary : colors.textMuted, { duration: 200 }),
  }));

  const contentOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(item.checked ? 0.3 : 1, { duration: 250 }),
  }));

  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <Animated.View style={[styles.checkbox, checkboxStyle]}>
        {item.checked && (
          <Animated.View entering={FadeIn.duration(200)}>
            <MaterialIcons name="check" size={18} color={colors.white} />
          </Animated.View>
        )}
      </Animated.View>
      <Animated.View style={[styles.content, contentOpacity]}>
        <View style={styles.mainRow}>
          <Text style={[styles.name, { color: colors.text }, item.checked && styles.strikethrough]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.quantity, { color: colors.primary }]}>{item.quantity} {item.unit}</Text>
        </View>
        {item.notes && (
          <Text style={[styles.notes, { color: colors.textTertiary }, item.checked && styles.strikethrough]}>{item.notes}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function PrepSectionHeader({ station, tag }: { station: string; tag: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{station}</Text>
      <View style={[styles.stationBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primaryMuted }]}>
        <Text style={[styles.stationBadgeText, { color: colors.primary }]}>{tag}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.lg },
  checkbox: { width: 28, height: 28, borderRadius: BorderRadius.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  // contentChecked opacity now animated via Reanimated
  mainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontFamily: 'Inter_700Bold', fontSize: FontSize.base, flex: 1, marginRight: Spacing.sm },
  strikethrough: { textDecorationLine: 'line-through' },
  quantity: { fontFamily: 'Inter_700Bold', fontSize: FontSize.base },
  notes: { fontFamily: 'Inter_400Regular', fontSize: FontSize.md, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: Spacing.md },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.sm, textTransform: 'uppercase', letterSpacing: 1.5 },
  stationBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, borderWidth: 1 },
  stationBadgeText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, letterSpacing: 0.5 },
});
