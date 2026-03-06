import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  rightAccessory?: React.ReactNode;
  badge?: string | number;
  noBorder?: boolean;
}

export function ScreenHeader({ title, subtitle, icon, rightAccessory, badge, noBorder }: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, !noBorder && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {icon && (
            <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
              <MaterialIcons name={icon} size={18} color="#FFFFFF" />
            </View>
          )}
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
            )}
          </View>
          {badge !== undefined && (
            <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{badge}</Text>
            </View>
          )}
        </View>
        {rightAccessory && <View style={styles.right}>{rightAccessory}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  right: {
    flexShrink: 0,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xl,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
});
