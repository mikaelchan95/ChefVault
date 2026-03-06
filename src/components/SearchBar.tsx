import { StyleSheet, TextInput, View } from 'react-native';

import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, BorderRadius, Spacing } from '@/src/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search recipes or ingredients' }: SearchBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <MaterialIcons name="search" size={20} color={colors.textMuted} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
          <MaterialIcons name="close" size={18} color={colors.textMuted} onPress={() => onChangeText('')} style={styles.clearIcon} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, height: 48, borderWidth: StyleSheet.hairlineWidth },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: FontSize.md, padding: 0 },
  clearIcon: { marginLeft: Spacing.sm, padding: 4 },
});
