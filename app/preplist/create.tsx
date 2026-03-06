import { useState, useCallback, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius, stringToColor } from '@/src/constants/theme';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { STATIONS } from '@/src/stores/recipeStore';
import { useToastStore } from '@/src/stores/toastStore';
import type { Recipe } from '@/src/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATION_KEYWORDS: Record<string, string> = {
  salmon: 'Protein & Seafood',
  chicken: 'Protein & Seafood',
  beef: 'Protein & Seafood',
  fish: 'Protein & Seafood',
  pork: 'Protein & Seafood',
  shrimp: 'Protein & Seafood',
  garlic: 'Produce & Aromatics',
  shallot: 'Produce & Aromatics',
  ginger: 'Produce & Aromatics',
  thyme: 'Produce & Aromatics',
  mushroom: 'Produce & Aromatics',
  potato: 'Produce & Aromatics',
  avocado: 'Produce & Aromatics',
  vegetable: 'Produce & Aromatics',
  lemon: 'Produce & Aromatics',
  cream: 'Dairy & Fats',
  butter: 'Dairy & Fats',
  oil: 'Dairy & Fats',
  parmesan: 'Dairy & Fats',
  tahini: 'Dairy & Fats',
  cheese: 'Dairy & Fats',
};

function estimateStation(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, station] of Object.entries(STATION_KEYWORDS)) {
    if (lower.includes(keyword)) return station;
  }
  return 'Dry Goods';
}

export default function CreatePrepListScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const recipes = useRecipeStore((s) => s.recipes);
  const createPrepListFromRecipes = useRecipeStore((s) => s.createPrepListFromRecipes);

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canGenerate = name.trim().length > 0 && selectedIds.size > 0;

  const toggleRecipe = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const preview = useMemo(() => {
    if (selectedIds.size === 0) return null;

    const selected = recipes.filter((r) => selectedIds.has(r.id));
    const allIngredients = selected.flatMap((r) => r.ingredients ?? []);

    const uniqueByKey = new Map<string, true>();
    for (const ing of allIngredients) {
      uniqueByKey.set(`${ing.name.toLowerCase()}|${ing.unit}`, true);
    }

    const stationSet = new Set<string>();
    for (const ing of allIngredients) {
      stationSet.add(estimateStation(ing.name));
    }

    return {
      itemCount: uniqueByKey.size,
      recipeCount: selected.length,
      stations: Array.from(stationSet),
    };
  }, [selectedIds, recipes]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    const listDate = date.trim() || new Date().toISOString().slice(0, 10);
    try {
      await createPrepListFromRecipes(name.trim(), listDate, Array.from(selectedIds));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useToastStore.getState().show({ message: 'Prep list created', type: 'success' });
      router.back();
    } catch {
      useToastStore.getState().show({ message: 'Failed to create prep list', type: 'error' });
    }
  }, [canGenerate, name, date, selectedIds, createPrepListFromRecipes]);

  const genBtnScale = useSharedValue(1);
  const genBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: genBtnScale.value }],
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Prep List</Text>
        <Pressable
          onPress={handleGenerate}
          disabled={!canGenerate}
          style={styles.headerSide}
        >
          <Text
            style={[
              styles.headerAction,
              { color: canGenerate ? colors.primary : colors.textMuted },
            ]}
          >
            Generate
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={44}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Fields */}
          <View style={styles.section}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Prep List Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.field,
                    borderColor: colors.borderSubtle,
                    color: colors.text,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Sunday Brunch"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Date</Text>
              <Pressable
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.field,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                onPress={() => setDatePickerVisible(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={colors.textMuted} />
                <Text style={[styles.dateText, { color: date ? colors.text : colors.textMuted }]}>
                  {date || 'Select date'}
                </Text>
              </Pressable>
              {datePickerVisible && (
                <DateTimePicker
                  value={date ? new Date(date) : new Date()}
                  mode="date"
                  display="spinner"
                  themeVariant="dark"
                  onChange={(event, selectedDate) => {
                    setDatePickerVisible(false);
                    if (event.type === 'set' && selectedDate) {
                      setDate(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* Recipe Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                SELECT RECIPES
              </Text>
              {selectedIds.size > 0 && (
                <Text style={[styles.selectedCount, { color: colors.primary }]}>
                  {selectedIds.size} recipe{selectedIds.size !== 1 ? 's' : ''} selected
                </Text>
              )}
            </View>

            <View style={styles.recipeGrid}>
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  selected={selectedIds.has(recipe.id)}
                  onToggle={toggleRecipe}
                  colors={colors}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>

          {/* Preview */}
          {preview && (
            <Animated.View entering={FadeInDown.duration(300).springify()} style={styles.section}>
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
                ]}
              >
                <View style={styles.previewHeader}>
                  <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
                  <Text style={[styles.previewTitle, { color: colors.primary }]}>
                    Preview
                  </Text>
                </View>

                <Text style={[styles.previewSummary, { color: colors.text }]}>
                  This will generate{' '}
                  <Text style={styles.previewBold}>{preview.itemCount} items</Text> from{' '}
                  <Text style={styles.previewBold}>
                    {preview.recipeCount} recipe{preview.recipeCount !== 1 ? 's' : ''}
                  </Text>
                </Text>

                <View style={styles.stationBreakdown}>
                  <Text style={[styles.stationTitle, { color: colors.textSecondary }]}>
                    Estimated stations:
                  </Text>
                  <View style={styles.stationChips}>
                    {preview.stations.map((station, index) => (
                      <Animated.View
                        key={station}
                        entering={FadeIn.delay(index * 50).duration(200)}
                      >
                        <View
                          style={[
                            styles.stationChip,
                            { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                          ]}
                        >
                          <MaterialIcons
                            name={stationIcon(station)}
                            size={12}
                            color={colors.primary}
                          />
                          <Text style={[styles.stationChipText, { color: colors.textSecondary }]}>
                            {station}
                          </Text>
                        </View>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Generate Button */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: colors.card,
            borderTopColor: colors.borderSubtle,
          },
        ]}
      >
        <AnimatedPressable
          style={[
            styles.generateButton,
            {
              backgroundColor: canGenerate ? colors.primary : colors.field,
              shadowColor: canGenerate ? colors.primary : 'transparent',
            },
            genBtnAnimStyle,
          ]}
          onPressIn={() => { genBtnScale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
          onPressOut={() => { genBtnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
          onPress={handleGenerate}
          disabled={!canGenerate}
        >
          <MaterialIcons
            name="playlist-add-check"
            size={20}
            color={canGenerate ? colors.white : colors.textMuted}
          />
          <Text
            style={[
              styles.generateButtonText,
              { color: canGenerate ? colors.white : colors.textMuted },
            ]}
          >
            Generate Prep List
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function stationIcon(station: string): keyof typeof MaterialIcons.glyphMap {
  switch (station) {
    case 'Protein & Seafood':
      return 'set-meal';
    case 'Produce & Aromatics':
      return 'eco';
    case 'Dairy & Fats':
      return 'opacity';
    case 'Dry Goods':
      return 'inventory-2';
    default:
      return 'category';
  }
}

interface RecipeCardProps {
  recipe: Recipe;
  selected: boolean;
  onToggle: (id: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}

function RecipeCard({ recipe, selected, onToggle, colors, isDark }: RecipeCardProps) {
  const ingredientCount = recipe.ingredients?.length ?? 0;
  const cuisineColor = recipe.cuisine ? stringToColor(recipe.cuisine, isDark) : colors.field;

  const borderStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(selected ? colors.primaryLight : colors.card, { duration: 200 }),
    borderColor: withTiming(selected ? colors.primaryBorder : colors.borderSubtle, { duration: 200 }),
  }));

  return (
    <AnimatedPressable
      onPress={() => onToggle(recipe.id)}
      style={[styles.recipeCard, borderStyle]}
    >
      {selected && (
        <Animated.View
          entering={ZoomIn.duration(200)}
          style={[styles.checkOverlay, { backgroundColor: colors.primary }]}
        >
          <MaterialIcons name="check" size={14} color={colors.white} />
        </Animated.View>
      )}

      <Text
        style={[styles.recipeTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {recipe.title}
      </Text>

      <View style={styles.recipeCardMeta}>
        {recipe.cuisine && (
          <View style={[styles.cuisineChip, { backgroundColor: cuisineColor }]}>
            <Text style={[styles.cuisineChipText, { color: colors.textSecondary }]}>
              {recipe.cuisine}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.recipeCardFooter}>
        <View style={styles.recipeCardStat}>
          <MaterialIcons name="restaurant" size={12} color={colors.textMuted} />
          <Text style={[styles.recipeCardStatText, { color: colors.textMuted }]}>
            {ingredientCount} items
          </Text>
        </View>
        <View style={styles.recipeCardStat}>
          <MaterialIcons name="people-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.recipeCardStatText, { color: colors.textMuted }]}>
            {recipe.servings}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: {
    minWidth: 72,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.lg,
    textAlign: 'center',
    flex: 1,
  },
  headerAction: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.base,
    textAlign: 'right',
  },

  scrollContent: {
    paddingBottom: 140,
  },

  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  selectedCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.sm,
  },

  field: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
    paddingLeft: 4,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    paddingHorizontal: Spacing.lg,
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.md,
  },
  dateButton: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.md,
  },

  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  recipeCard: {
    width: '47.5%',
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  checkOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  recipeCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  cuisineChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  cuisineChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.xs,
  },
  recipeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  recipeCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recipeCardStatText: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.xs,
  },

  previewCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewSummary: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  previewBold: {
    fontFamily: 'Inter_700Bold',
  },

  stationBreakdown: {
    gap: Spacing.sm,
  },
  stationTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.sm,
  },
  stationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stationChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.xs,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
