import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useRecipeStore, STATION_TAGS } from '@/src/stores/recipeStore';
import { PrepItemRow, PrepSectionHeader } from '@/src/components/prep/PrepItemRow';
import { AnimatedFAB, useScrollHandler } from '@/src/components/animated/AnimatedFAB';
import { AnimatedListItem } from '@/src/components/animated/AnimatedListItem';
import type { PrepItem } from '@/src/types';

type TabFilter = 'all' | 'pending' | 'completed';

function AnimatedProgressFill({ progress, color }: { progress: number; color: string }) {
  const sv = useSharedValue(progress * 100);

  useEffect(() => {
    sv.value = withTiming(progress * 100, { duration: 400 });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(sv.value)}%`,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.progressFill, fillStyle]} />;
}

export default function PrepListsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const prepLists = useRecipeStore((s) => s.prepLists);
  const togglePrepItem = useRecipeStore((s) => s.togglePrepItem);
  const deletePrepList = useRecipeStore((s) => s.deletePrepList);
  const initialize = useRecipeStore((s) => s.initialize);
  const [selectedListId, setSelectedListId] = useState<string | null>(prepLists[0]?.id ?? null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!selectedListId || !prepLists.find((pl) => pl.id === selectedListId)) {
      setSelectedListId(prepLists[0]?.id ?? null);
    }
  }, [prepLists]);
  const [tab, setTab] = useState<TabFilter>('all');
  const { scrollHandler, scrollY } = useScrollHandler();

  const selectedList = prepLists.find((pl) => pl.id === selectedListId);

  const groupedItems = useMemo(() => {
    if (!selectedList) return [];
    const items = selectedList.items.filter((item) => {
      if (tab === 'pending') return !item.checked;
      if (tab === 'completed') return item.checked;
      return true;
    });
    const groups = new Map<string, PrepItem[]>();
    for (const item of items) {
      const list = groups.get(item.station) ?? [];
      list.push(item);
      groups.set(item.station, list);
    }
    return Array.from(groups.entries());
  }, [selectedList, tab]);

  const totalItems = selectedList?.items.length ?? 0;
  const checkedCount = selectedList?.items.filter((i) => i.checked).length ?? 0;
  const progress = totalItems > 0 ? checkedCount / totalItems : 0;

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All Items' },
    { key: 'pending', label: 'To Do' },
    { key: 'completed', label: 'Completed' },
  ];

  const handleCreatePrepList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/preplist/create');
  };

  const handleDeleteList = () => {
    if (!selectedList) return;
    Alert.alert(
      'Delete Prep List',
      `Delete "${selectedList.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePrepList(selectedList.id);
            const remaining = prepLists.filter((pl) => pl.id !== selectedList.id);
            setSelectedListId(remaining[0]?.id ?? null);
          },
        },
      ],
    );
  };

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={[styles.headerWrap, { borderBottomColor: colors.borderSubtle }]}>
        <ScreenHeader
          icon="checklist"
          title={selectedList?.name ?? 'Prep Lists'}
          subtitle={selectedList ? `${selectedList.date} · ${totalItems} Items · ${checkedCount} Done` : undefined}
          noBorder
          rightAccessory={
            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton} hitSlop={8} onPress={handleCreatePrepList}>
                <MaterialIcons name="add-circle-outline" size={22} color={colors.primary} />
              </Pressable>
              {selectedList && (
                <Pressable style={styles.iconButton} hitSlop={8} onPress={handleDeleteList}>
                  <MaterialIcons name="delete-outline" size={22} color={colors.error} />
                </Pressable>
              )}
            </View>
          }
        />

        {selectedList && totalItems > 0 && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: colors.field }]}>
              <AnimatedProgressFill
                progress={progress}
                color={progress === 1 ? colors.success : colors.primary}
              />
            </View>
            <Text style={[styles.progressText, { color: progress === 1 ? colors.success : colors.textTertiary }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        )}

        {prepLists.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listPicker}>
            {prepLists.map((pl) => (
              <Pressable
                key={pl.id}
                style={[styles.listChip, pl.id === selectedListId ? { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder } : { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                onPress={() => { setSelectedListId(pl.id); setTab('all'); }}
              >
                <Text style={[styles.listChipText, { color: pl.id === selectedListId ? colors.primary : colors.textSecondary }]}>{pl.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <Pressable key={t.key} style={[styles.tab, tab === t.key && { borderBottomColor: colors.primary }]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, { color: tab === t.key ? colors.text : colors.textMuted }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.checklistContent}
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
      >
        {groupedItems.map(([station, items], groupIdx) => (
          <AnimatedListItem key={station} index={groupIdx}>
            <PrepSectionHeader station={station} tag={STATION_TAGS[station] ?? 'ALL'} />
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              {items.map((item, idx) => (
                <View key={item.id}>
                  <PrepItemRow
                    item={item}
                    onToggle={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); togglePrepItem(selectedListId!, item.id); }}
                  />
                  {idx < items.length - 1 && <View style={[sharedStyles.divider]} />}
                </View>
              ))}
            </View>
          </AnimatedListItem>
        ))}
        {groupedItems.length === 0 && (
          <View style={sharedStyles.emptyContainer}>
            {!selectedList ? (
              <>
                <MaterialIcons name="playlist-add" size={48} color={colors.textMuted} />
                <Text style={sharedStyles.emptyTitle}>No prep lists yet</Text>
                <Text style={sharedStyles.emptySubtitle}>
                  Create a prep list to start tracking items
                </Text>
                <Pressable onPress={handleCreatePrepList}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md, color: colors.primary, marginTop: Spacing.sm }}>
                    Create your first prep list
                  </Text>
                </Pressable>
              </>
            ) : tab === 'completed' ? (
              <>
                <MaterialIcons name="pending-actions" size={48} color={colors.textMuted} />
                <Text style={sharedStyles.emptyTitle}>Nothing completed yet</Text>
                <Text style={sharedStyles.emptySubtitle}>
                  Check off items as you complete them
                </Text>
              </>
            ) : tab === 'pending' ? (
              <>
                <MaterialIcons name="check-circle" size={48} color={colors.success} />
                <Text style={sharedStyles.emptyTitle}>All caught up</Text>
                <Text style={sharedStyles.emptySubtitle}>
                  Every item on this list is done
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="check-circle" size={48} color={colors.success} />
                <Text style={sharedStyles.emptyTitle}>All caught up</Text>
                <Text style={sharedStyles.emptySubtitle}>
                  Every item on this list is done
                </Text>
              </>
            )}
          </View>
        )}
      </Animated.ScrollView>

      <AnimatedFAB onPress={handleCreatePrepList} scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  headerActions: { flexDirection: 'row', gap: Spacing.xs },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.sm, minWidth: 36, textAlign: 'right' },
  listPicker: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  listChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: StyleSheet.hairlineWidth },
  listChipText: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.sm },
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.xxl },
  tab: { paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.md },
  checklistContent: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.xxl },
  sectionCard: { borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
