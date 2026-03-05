import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { CollectionCard, CreateCollectionCard } from '@/src/components/CollectionCard';
import { SearchBar } from '@/src/components/SearchBar';
import { AnimatedFAB, useScrollHandler } from '@/src/components/animated/AnimatedFAB';
import { AnimatedListItem } from '@/src/components/animated/AnimatedListItem';
import type { Collection } from '@/src/types';

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const collections = useRecipeStore((s) => s.collections);
  const profile = useAuthStore((s) => s.profile);
  const [search, setSearch] = useState('');

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
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="restaurant-menu" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>ChefVault</Text>
          </View>
          <Pressable
            style={[styles.accountButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            hitSlop={8}
            onPress={() => router.push('/settings/profile')}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.accountAvatar} contentFit="cover" transition={200} />
            ) : (
              <MaterialIcons name="person" size={22} color={colors.textSecondary} />
            )}
          </Pressable>
        </View>
        <View style={styles.headerBottom}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Collections</Text>
          <Pressable style={styles.newButton} onPress={handleCreateCollection}>
            <MaterialIcons name="add-circle" size={20} color={colors.primary} />
            <Text style={[styles.newButtonText, { color: colors.primary }]}>New</Text>
          </Pressable>
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search collections..." />
      </View>

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
      />

      <AnimatedFAB onPress={handleCreateCollection} scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandIcon: { width: 32, height: 32, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xxl, letterSpacing: -0.5 },
  accountButton: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  accountAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenTitle: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.xl },
  newButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newButtonText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.md },
  listContent: { padding: Spacing.lg, paddingBottom: 120 },
  gridRow: { gap: Spacing.lg, marginBottom: Spacing.lg },
  gridItem: { flex: 1 },
});
