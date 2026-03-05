import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { RecipeCard } from '@/src/components/RecipeCard';
import { SearchBar } from '@/src/components/SearchBar';
import { FilterChips } from '@/src/components/FilterChips';
import { AnimatedFAB, useScrollHandler } from '@/src/components/animated/AnimatedFAB';
import { AnimatedListItem } from '@/src/components/animated/AnimatedListItem';
import { RecipeCardSkeleton } from '@/src/components/Skeleton';
import type { Recipe } from '@/src/types';
import { useMemo } from 'react';

export default function RecipeLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const { searchQuery, selectedCuisine, setSearchQuery, setSelectedCuisine, getFilteredRecipes, recipes } =
    useRecipeStore();
  const isLoaded = useRecipeStore((s) => s.isLoaded);
  const { scrollHandler, scrollY } = useScrollHandler();

  const filteredRecipes = getFilteredRecipes();
  const cuisines = useMemo(() => {
    const set = new Set(recipes.map((r) => r.cuisine).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [recipes]);

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="restaurant-menu" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Recipes</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{recipes.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchSection}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <FilterChips options={cuisines} selected={selectedCuisine} onSelect={setSelectedCuisine} />
      </View>

      {!isLoaded ? (
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={i > 0 ? { marginTop: Spacing.md } : undefined}>
              <RecipeCardSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <Animated.FlatList
          data={filteredRecipes}
          renderItem={({ item, index }: { item: Recipe; index: number }) => (
            <AnimatedListItem index={index}>
              <RecipeCard recipe={item} />
            </AnimatedListItem>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={sharedStyles.emptyContainer}>
              <MaterialIcons name="restaurant" size={48} color={colors.textMuted} />
              <Text style={sharedStyles.emptyTitle}>No recipes found</Text>
              <Text style={sharedStyles.emptySubtitle}>
                {searchQuery ? 'Try a different search' : 'Tap + to create your first recipe'}
              </Text>
            </View>
          }
        />
      )}

      <AnimatedFAB onPress={() => router.push('/recipe/create')} scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  brandIcon: { width: 32, height: 32, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xl, letterSpacing: -0.3 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, minWidth: 28, alignItems: 'center' },
  countText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  searchSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.md },
  listContent: { padding: Spacing.lg, paddingBottom: 120 },
  separator: { height: Spacing.md },
});
