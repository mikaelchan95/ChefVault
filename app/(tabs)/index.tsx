import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { RecipeCard } from '@/src/components/RecipeCard';
import { SearchBar } from '@/src/components/SearchBar';
import { FilterChips } from '@/src/components/FilterChips';
import { AnimatedFAB, useScrollHandler } from '@/src/components/animated/AnimatedFAB';
import { AnimatedListItem } from '@/src/components/animated/AnimatedListItem';
import { RecipeCardSkeleton } from '@/src/components/Skeleton';
import * as Haptics from 'expo-haptics';
import type { Recipe } from '@/src/types';
import { useCallback, useMemo, useState } from 'react';

export default function RecipeLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const { searchQuery, selectedCuisine, setSearchQuery, setSelectedCuisine, getFilteredRecipes, recipes } =
    useRecipeStore();
  const isLoaded = useRecipeStore((s) => s.isLoaded);
  const initialize = useRecipeStore((s) => s.initialize);
  const { scrollHandler, scrollY } = useScrollHandler();
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const deleteRecipes = useRecipeStore((s) => s.deleteRecipes);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  };

  const filteredRecipes = getFilteredRecipes();
  const cuisines = useMemo(() => {
    const set = new Set(recipes.map((r) => r.cuisine).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [recipes]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enterSelectionMode = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredRecipes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecipes.map((r) => r.id)));
    }
  }, [filteredRecipes, selectedIds.size]);

  const handleBatchDelete = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      'Delete Recipes',
      `Are you sure you want to delete ${count} recipe${count > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRecipes(Array.from(selectedIds));
            exitSelectionMode();
          },
        },
      ],
    );
  }, [selectedIds, deleteRecipes, exitSelectionMode]);

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      {selectionMode ? (
        <View style={[styles.selectionHeader, { borderBottomColor: colors.borderSubtle }]}>
          <Pressable onPress={exitSelectionMode} hitSlop={12}>
            <Text style={[styles.selectionAction, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.selectionTitle, { color: colors.text }]}>
            {selectedIds.size} Selected
          </Text>
          <Pressable onPress={handleSelectAll} hitSlop={12}>
            <Text style={[styles.selectionAction, { color: colors.primary }]}>
              {selectedIds.size === filteredRecipes.length ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScreenHeader icon="restaurant-menu" title="Recipes" badge={recipes.length} />
      )}

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
              <RecipeCard
                recipe={item}
                selectable={selectionMode}
                selected={selectedIds.has(item.id)}
                onPress={selectionMode ? () => toggleSelection(item.id) : undefined}
                onLongPress={selectionMode ? undefined : () => enterSelectionMode(item.id)}
              />
            </AnimatedListItem>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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

      {selectionMode ? (
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.borderSubtle, paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable
            style={[styles.deleteAction, { backgroundColor: selectedIds.size > 0 ? colors.error : colors.field }]}
            onPress={handleBatchDelete}
            disabled={selectedIds.size === 0}
          >
            <MaterialIcons name="delete-outline" size={20} color={selectedIds.size > 0 ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.deleteActionText, { color: selectedIds.size > 0 ? '#FFFFFF' : colors.textMuted }]}>
              Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Text>
          </Pressable>
        </View>
      ) : (
        <AnimatedFAB onPress={() => router.push('/recipe/create')} scrollY={scrollY} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  selectionTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xl, letterSpacing: -0.3 },
  searchSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.md },
  listContent: { padding: Spacing.lg, paddingBottom: 120 },
  separator: { height: Spacing.md },
  selectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  deleteActionText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
