import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing } from '@/src/constants/theme';
import { AnimatedToggle } from '@/src/components/animated/AnimatedToggle';

interface ToggleRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  title: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  isLast?: boolean;
}

export function ToggleRow({ icon, iconColor, title, value, onToggle, isLast = false }: ToggleRowProps) {
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.row}>
        <MaterialIcons name={icon} size={22} color={iconColor ?? colors.textTertiary} />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <AnimatedToggle
          value={value}
          onToggle={onToggle}
          trackColorOff={colors.border}
          trackColorOn={colors.primary}
        />
      </View>
      {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  title: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: FontSize.md },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
});
