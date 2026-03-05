import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/hooks/useTheme';
import { Spacing } from '@/src/constants/theme';

export function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { sharedStyles } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={sharedStyles.sectionLabel}>{label}</Text>
      <View style={sharedStyles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
});
