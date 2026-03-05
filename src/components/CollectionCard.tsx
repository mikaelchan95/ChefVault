import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius, stringToColor } from '@/src/constants/theme';
import type { Collection } from '@/src/types';

export function CollectionCard({ collection, onPress }: { collection: Collection; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const bgColor = stringToColor(collection.name, isDark);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, animStyle]}>
        <View style={[styles.cover, { backgroundColor: bgColor }]}>
          <MaterialIcons name="restaurant" size={32} color="rgba(255,255,255,0.15)" />
          {collection.status === 'active' && (
            <View style={styles.activeBadge}><Text style={styles.badgeText}>Active</Text></View>
          )}
          {collection.status === 'draft' && (
            <View style={[styles.draftBadge, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)' }]}>
              <Text style={[styles.draftBadgeText, { color: colors.textSecondary }]}>Draft</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.infoText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{collection.name}</Text>
            <Text style={[styles.count, { color: colors.textTertiary }]}>{collection.recipe_ids.length} recipes</Text>
          </View>
          <MaterialIcons name="folder-open" size={20} color={colors.primary} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function CreateCollectionCard({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Animated.View style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.border }, animStyle]}>
        <MaterialIcons name="create-new-folder" size={36} color={colors.primary} />
        <Text style={[styles.createText, { color: colors.textTertiary }]}>Create Folder</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: BorderRadius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  // pressed style removed — handled by Reanimated spring animation
  cover: { height: 110, alignItems: 'center', justifyContent: 'center' },
  activeBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,122,0,0.9)', borderRadius: BorderRadius.md, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 },
  draftBadge: { position: 'absolute', top: 8, right: 8, borderRadius: BorderRadius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingVertical: 3 },
  draftBadgeText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  info: { padding: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  infoText: { flex: 1, overflow: 'hidden' },
  name: { fontFamily: 'Inter_700Bold', fontSize: FontSize.md, textTransform: 'uppercase', letterSpacing: -0.2 },
  count: { fontFamily: 'Inter_400Regular', fontSize: FontSize.sm, marginTop: 4 },
  createCard: { flex: 1, height: 180, borderRadius: BorderRadius.xl, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  createText: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.sm, textTransform: 'uppercase', letterSpacing: 2 },
});
