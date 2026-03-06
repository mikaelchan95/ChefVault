import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, PressScale, PressSpring } from '@/src/constants/theme';

interface SettingsRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  trailing?: React.ReactNode;
  isLast?: boolean;
}

export function SettingsRow({ icon, title, value, valueColor, onPress, showChevron = true, trailing, isLast = false }: SettingsRowProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <>
      <Pressable
        onPressIn={() => { scale.value = withSpring(PressScale.card, PressSpring.card); }}
        onPressOut={() => { scale.value = withSpring(1, PressSpring.card); }}
        onPress={onPress}
        disabled={!onPress}
      >
        <Animated.View style={[styles.row, animatedStyle]}>
          <MaterialIcons name={icon} size={22} color={colors.textTertiary} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <View style={styles.trailing}>
            {trailing}
            {value && <Text style={[styles.value, { color: valueColor ?? colors.textTertiary }]}>{value}</Text>}
            {showChevron && onPress && <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />}
          </View>
        </Animated.View>
      </Pressable>
      {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  title: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: FontSize.md },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  value: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.sm },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
});
