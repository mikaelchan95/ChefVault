import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { Spacing } from '@/src/constants/theme';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { CollectionCard, CreateCollectionCard } from '@/src/components/CollectionCard';
import { CollectionCardSkeleton } from '@/src/components/Skeleton';
import { SearchBar } from '@/src/components/SearchBar';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { AnimatedFAB, useScrollHandler } from '@/src/components/animated/AnimatedFAB';
import { AnimatedListItem } from '@/src/components/animated/AnimatedListItem';
import type { Collection } from '@/src/types';

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const collections = useRecipeStore((s) => s.collections);
  const isLoaded = useRecipeStore((s) => s.isLoaded);
  const initialize = useRecipeStore((s) => s.initialize);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  };

  const filtered = search
    ? collections.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : collections;

  const dataWithCreate = [...filtered, null] as (Collection | null)[];

  const handleOpenCollection = (collection: Collection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/collection/${collection.id}`);
  };

  const handleCreateCollection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/collection/create');
  };

  const { scrollHandler, scrollY } = useScrollHandler();

  const renderItem = ({ item, index }: { item: Collection | null; index: number }) => {
    if (!item) return <AnimatedListItem index={index}><View style={styles.gridItem}><CreateCollectionCard onPress={handleCreateCollection} /></View></AnimatedListItem>;
    return <AnimatedListItem index={index}><View style={styles.gridItem}><CollectionCard collection={item} onPress={() => handleOpenCollection(item)} /></View></AnimatedListItem>;
  };

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <ScreenHeader icon="restaurant-menu" title="Collections" />
      <View style={styles.searchSection}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search collections..." />
      </View>

      {!isLoaded ? (
        <View style={styles.listContent}>
          <View style={styles.gridRow}>
            <View style={styles.gridItem}><CollectionCardSkeleton /></View>
            <View style={styles.gridItem}><CollectionCardSkeleton /></View>
          </View>
          <View style={styles.gridRow}>
            <View style={styles.gridItem}><CollectionCardSkeleton /></View>
            <View style={styles.gridItem}><CollectionCardSkeleton /></View>
          </View>
        </View>
      ) : (
        <Animated.FlatList
          data={dataWithCreate}
          renderItem={renderItem}
          keyExtractor={(item, index) => item?.id ?? `create-${index}`}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
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
        />
      )}

      <AnimatedFAB onPress={handleCreateCollection} scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  searchSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  listContent: { padding: Spacing.lg, paddingBottom: 120 },
  gridRow: { gap: Spacing.lg, marginBottom: Spacing.lg },
  gridItem: { flex: 1 },
});
