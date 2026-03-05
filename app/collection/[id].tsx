import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius, stringToColor } from '@/src/constants/theme';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useToastStore } from '@/src/stores/toastStore';
import { RecipeCard } from '@/src/components/RecipeCard';
import { ContextMenu } from '@/src/components/ContextMenu';
import type { Recipe } from '@/src/types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles, isDark } = useTheme();

  const collection = useRecipeStore((s) => s.collections.find((c) => c.id === id));
  const allRecipes = useRecipeStore((s) => s.recipes);
  const addRecipeToCollection = useRecipeStore((s) => s.addRecipeToCollection);
  const removeRecipeFromCollection = useRecipeStore((s) => s.removeRecipeFromCollection);
  const deleteCollection = useRecipeStore((s) => s.deleteCollection);

  const collectionRecipes = useMemo(
    () => (collection ? allRecipes.filter((r) => collection.recipe_ids.includes(r.id)) : []),
    [collection, allRecipes],
  );

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const heroColor = useMemo(
    () => (collection ? stringToColor(collection.name, isDark) : colors.card),
    [collection, isDark, colors.card],
  );

  const memberIds = useMemo(
    () => new Set(collection?.recipe_ids ?? []),
    [collection?.recipe_ids],
  );

  const handleRemoveRecipe = useCallback(
    (recipe: Recipe) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        'Remove Recipe',
        `Remove "${recipe.title}" from this collection?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              removeRecipeFromCollection(id!, recipe.id);
              useToastStore.getState().show({ message: 'Recipe removed', type: 'info' });
            },
          },
        ],
      );
    },
    [id, removeRecipeFromCollection],
  );

  const handleToggleRecipe = useCallback(
    (recipeId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (memberIds.has(recipeId)) {
        removeRecipeFromCollection(id!, recipeId);
      } else {
        addRecipeToCollection(id!, recipeId);
      }
    },
    [id, memberIds, addRecipeToCollection, removeRecipeFromCollection],
  );

  const handleDeleteCollection = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Collection',
      `Permanently delete "${collection?.name}"? Recipes won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCollection(id!);
            router.back();
          },
        },
      ],
    );
  }, [id, collection?.name, deleteCollection]);

  if (!collection) {
    return (
      <View style={[sharedStyles.screenContainer, { alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }]}>
        <MaterialIcons name="folder-off" size={48} color={colors.textMuted} />
        <Text style={sharedStyles.emptyTitle}>Collection not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md, color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isActive = collection.status === 'active';

  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <View style={s.recipeItemWrapper}>
      <Pressable onLongPress={() => handleRemoveRecipe(item)}>
        <RecipeCard recipe={item} />
      </Pressable>
    </View>
  );

  const ListHeader = () => (
    <>
      {/* Hero section */}
      <Animated.View entering={FadeInDown.duration(400)} style={[s.hero, { backgroundColor: heroColor }]}>
        <View style={s.heroContent}>
          {collection.icon ? (
            <Text style={s.heroIcon}>{collection.icon}</Text>
          ) : (
            <MaterialIcons name="folder-special" size={40} color="rgba(255,255,255,0.5)" />
          )}
          <Text style={s.heroName}>{collection.name}</Text>
          {collection.description && (
            <Text style={s.heroDescription}>{collection.description}</Text>
          )}
          <View style={[s.statusBadge, { backgroundColor: isActive ? colors.success : colors.warning }]}>
            <Text style={s.statusBadgeText}>{isActive ? 'Active' : 'Draft'}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)} style={[s.statsRow, { borderBottomColor: colors.borderSubtle }]}>
        <View style={s.statItem}>
          <MaterialIcons name="restaurant-menu" size={16} color={colors.primary} />
          <Text style={[s.statValue, { color: colors.text }]}>{collectionRecipes.length}</Text>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>
            {collectionRecipes.length === 1 ? 'Recipe' : 'Recipes'}
          </Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: colors.border }]} />
        <View style={s.statItem}>
          <MaterialIcons name="event" size={16} color={colors.primary} />
          <Text style={[s.statValue, { color: colors.text }]}>{formatDate(collection.created_at)}</Text>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>Created</Text>
        </View>
      </Animated.View>

      {/* Add recipes button */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <Pressable
          style={[s.addRecipesButton, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAddModalVisible(true);
          }}
        >
          <MaterialIcons name="playlist-add" size={22} color={colors.primary} />
          <Text style={[s.addRecipesButtonText, { color: colors.primary }]}>Add Recipes</Text>
        </Pressable>
      </Animated.View>

      {/* Section label */}
      {collectionRecipes.length > 0 && (
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>Recipes</Text>
          <Text style={[s.sectionCount, { color: colors.textTertiary }]}>{collectionRecipes.length}</Text>
        </View>
      )}
    </>
  );

  const ListEmpty = () => (
    <View style={sharedStyles.emptyContainer}>
      <MaterialIcons name="menu-book" size={56} color={colors.textMuted} />
      <Text style={sharedStyles.emptyTitle}>No recipes yet</Text>
      <Text style={sharedStyles.emptySubtitle}>Add recipes to this collection</Text>
    </View>
  );

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      {/* Top navigation bar */}
      <View style={[s.header, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {collection.name}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMenuVisible(true);
          }}
          hitSlop={12}
        >
          <MaterialIcons name="more-vert" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Recipe list */}
      <FlatList
        data={collectionRecipes}
        renderItem={renderRecipeItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [sharedStyles.fab, pressed && sharedStyles.fabPressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setAddModalVisible(true);
        }}
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Overflow menu */}
      <ContextMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={[
          { label: 'Add Recipes', icon: 'playlist-add', onPress: () => { setMenuVisible(false); setAddModalVisible(true); } },
          { label: 'Delete Collection', icon: 'delete-outline', onPress: handleDeleteCollection, destructive: true },
        ]}
      />

      {/* Add recipes modal */}
      <Modal visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={[s.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
            <Pressable onPress={() => setAddModalVisible(false)} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={[s.modalTitle, { color: colors.text }]}>Manage Recipes</Text>
            <View style={{ width: 24 }} />
          </View>
          <Text style={[s.modalSubtitle, { color: colors.textSecondary }]}>
            Tap to add or remove recipes from this collection
          </Text>
          <ScrollView contentContainerStyle={s.modalList} showsVerticalScrollIndicator={false}>
            {allRecipes.map((recipe, index) => {
              const isMember = memberIds.has(recipe.id);
              return (
                <Animated.View
                  key={recipe.id}
                  entering={FadeInRight.delay(Math.min(index * 30, 300)).duration(200)}
                >
                  <Pressable
                    style={[
                      s.modalRecipeRow,
                      { borderBottomColor: colors.borderSubtle },
                      isMember && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => handleToggleRecipe(recipe.id)}
                  >
                    <View style={s.modalRecipeInfo}>
                      <Text style={[s.modalRecipeName, { color: colors.text }]} numberOfLines={1}>
                        {recipe.title}
                      </Text>
                      {recipe.cuisine && (
                        <Text style={[s.modalRecipeMeta, { color: colors.textTertiary }]}>{recipe.cuisine}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        s.checkbox,
                        { borderColor: isMember ? colors.primary : colors.border },
                        isMember && { backgroundColor: colors.primary },
                      ]}
                    >
                      {isMember && (
                        <Animated.View entering={ZoomIn.duration(150)}>
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        </Animated.View>
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
            {allRecipes.length === 0 && (
              <View style={[sharedStyles.emptyContainer, { paddingTop: 60 }]}>
                <MaterialIcons name="menu-book" size={48} color={colors.textMuted} />
                <Text style={sharedStyles.emptyTitle}>No recipes available</Text>
                <Text style={sharedStyles.emptySubtitle}>Create some recipes first</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.lg,
    letterSpacing: -0.2,
    flex: 1,
    textAlign: 'center',
  },

  hero: {
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroIcon: {
    fontSize: 40,
    marginBottom: Spacing.xs,
  },
  heroName: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xxxl,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xxl,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.md,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.sm,
  },
  statDivider: {
    width: 1,
    height: 20,
  },

  addRecipesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  addRecipesButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.sm,
  },

  listContent: {
    paddingBottom: 120,
  },
  recipeItemWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.lg,
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  modalList: {
    paddingBottom: 40,
  },
  modalRecipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRecipeInfo: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  modalRecipeName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.base,
  },
  modalRecipeMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
