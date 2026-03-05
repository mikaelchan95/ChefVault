import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, BorderRadius, Spacing, stringToColor } from '@/src/constants/theme';
import { calculateRecipeCost, formatCurrency } from '@/src/lib/costing';
import type { Recipe } from '@/src/types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(prepTime: number | null, cookTime: number | null): string {
  const total = (prepTime ?? 0) + (cookTime ?? 0);
  if (total === 0) return '';
  if (total >= 60) {
    const hrs = Math.floor(total / 60);
    const mins = total % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${total} min`;
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const timeStr = formatTime(recipe.prep_time, recipe.cook_time);
  const bgColor = stringToColor(recipe.title, isDark);
  const initial = recipe.title.charAt(0).toUpperCase();
  const thumbUri = recipe.plating_photos?.[0] ?? recipe.image_url;
  const costSummary = recipe.ingredients ? calculateRecipeCost(recipe.ingredients, recipe.servings) : null;
  const costStr = costSummary?.total_costed ? formatCurrency(costSummary.total_costed) : null;

  return (
    <Pressable
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.borderSubtle, shadowColor: colors.shadow, shadowOpacity: colors.cardShadowOpacity },
          animStyle,
        ]}
      >
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={[styles.thumbnail, { borderColor: colors.borderSubtle }]} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: bgColor, borderColor: colors.borderSubtle }]}>
            <Text style={styles.thumbnailText}>{initial}</Text>
          </View>
        )}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{recipe.title}</Text>
          <View style={styles.metaRow}>
            {recipe.cuisine && <Text style={[styles.metaText, { color: colors.textTertiary }]}>{recipe.cuisine}</Text>}
            {recipe.cuisine && <View style={[styles.dot, { backgroundColor: colors.border }]} />}
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{recipe.servings} Servings</Text>
            {timeStr !== '' && <View style={[styles.dot, { backgroundColor: colors.border }]} />}
            {timeStr !== '' && <Text style={[styles.metaText, { color: colors.textTertiary }]}>{timeStr}</Text>}
            {costStr && <View style={[styles.dot, { backgroundColor: colors.border }]} />}
            {costStr && <Text style={[styles.metaText, { color: colors.primary }]}>{costStr}</Text>}
          </View>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>Updated: {formatDate(recipe.updated_at)}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  // cardPressed removed — handled by Reanimated spring animation
  thumbnail: {
    width: 72, height: 72, borderRadius: BorderRadius.md, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center',
  },
  thumbnailText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xxl, color: 'rgba(255,255,255,0.6)' },
  content: { flex: 1, minWidth: 0 },
  title: { fontFamily: 'Inter_700Bold', fontSize: FontSize.base, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  metaText: { fontFamily: 'Inter_500Medium', fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  dateText: { fontFamily: 'Inter_400Regular', fontSize: FontSize.sm },
});
