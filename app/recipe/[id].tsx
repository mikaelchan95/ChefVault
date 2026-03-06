import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius, PressScale, PressSpring } from '@/src/constants/theme';
import { useAuthStore } from '@/src/stores/authStore';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { scaleRecipeIngredients, type ScaledIngredient } from '@/src/lib/scaling';
import { calculateRecipeCost, formatCurrency, calculateScaledCost } from '@/src/lib/costing';
import { PlatingPhotos } from '@/src/components/PlatingPhotos';
import { NumberTicker } from '@/src/components/animated/NumberTicker';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const recipe = useRecipeStore((s) => s.getRecipeById(id!));
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);
  const profileUnits = useAuthStore((s) => s.profile?.default_units) ?? 'metric';
  const [targetServings, setTargetServings] = useState(recipe?.servings ?? 1);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>(profileUnits);
  const minusScale = useSharedValue(1);
  const plusScale = useSharedValue(1);

  const minusAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: minusScale.value }],
  }));
  const plusAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plusScale.value }],
  }));

  const handlePhotosChange = useCallback(
    (photos: string[]) => {
      if (id) updateRecipe(id, { plating_photos: photos });
    },
    [id, updateRecipe],
  );

  const adjustServings = useCallback((delta: number) => {
    setTargetServings((prev) => {
      const next = prev + delta;
      if (next < 1 || next > 100) return prev;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return next;
    });
  }, []);

  const handleShare = async () => {
    if (!recipe) return;

    const ingredients = (recipe.ingredients ?? [])
      .map((i) => `  ${i.quantity} ${i.unit} ${i.name}${i.notes ? ` (${i.notes})` : ''}`)
      .join('\n');

    const steps = (recipe.steps ?? [])
      .map((s) => `${s.step_number}. ${s.instruction}`)
      .join('\n');

    const text = [
      recipe.title,
      recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : '',
      `Servings: ${recipe.servings}`,
      recipe.prep_time ? `Prep: ${recipe.prep_time} min` : '',
      recipe.cook_time ? `Cook: ${recipe.cook_time} min` : '',
      recipe.description ? `\n${recipe.description}` : '',
      '\nIngredients:',
      ingredients,
      '\nMethod:',
      steps,
      '\n— Shared from ChefVault',
    ]
      .filter(Boolean)
      .join('\n');

    await Share.share({ message: text, title: recipe.title });
  };

  if (!recipe) {
    return (
      <View style={[sharedStyles.screenContainer, { alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }]}>
        <Text style={sharedStyles.emptyTitle}>Recipe not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md, color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isScaled = targetServings !== recipe.servings;
  const isConverted = unitSystem !== profileUnits;
  const scaledIngredients: ScaledIngredient[] = recipe.ingredients
    ? scaleRecipeIngredients(recipe.ingredients, recipe.servings, targetServings, unitSystem)
    : [];
  const costSummary = recipe.ingredients
    ? calculateRecipeCost(recipe.ingredients, recipe.servings)
    : null;

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.borderPrimary }]}>
        <View style={s.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{recipe.title}</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => router.push(`/recipe/edit/${recipe.id}`)} hitSlop={8}>
            <MaterialIcons name="edit" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleShare} hitSlop={8}>
            <MaterialIcons name="share" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(350).delay(0)} style={[s.titleSection, { borderBottomColor: colors.borderPrimary }]}>
          <View style={s.titleRow}>
            <Text style={[s.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
          </View>
          {recipe.description && <Text style={[s.description, { color: colors.textSecondary }]}>{recipe.description}</Text>}
          <View style={s.metaGrid}>
            <View style={s.metaItem}>
              <Text style={[s.metaLabel, { color: colors.textMuted }]}>Cuisine</Text>
              <Text style={[s.metaValue, { color: colors.text }]}>{recipe.cuisine ?? '—'}</Text>
            </View>
            <View style={[s.metaItem, s.metaDivider, { borderLeftColor: colors.borderPrimary }]}>
              <Text style={[s.metaLabel, { color: colors.textMuted }]}>Prep Time</Text>
              <Text style={[s.metaValue, { color: colors.text }]}>{recipe.prep_time ? `${recipe.prep_time} min` : '—'}</Text>
            </View>
            <View style={[s.metaItem, s.metaDivider, { borderLeftColor: colors.borderPrimary }]}>
              <Text style={[s.metaLabel, { color: colors.textMuted }]}>Cook Time</Text>
              <Text style={[s.metaValue, { color: colors.text }]}>{recipe.cook_time ? `${recipe.cook_time} min` : '—'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Scaling */}
        <Animated.View entering={FadeInDown.duration(350).delay(100)} style={[s.scalingSection, { backgroundColor: colors.card, borderBottomColor: colors.borderPrimary }]}>
          <View>
            <Text style={[s.scalingTitle, { color: colors.textSecondary }]}>Servings</Text>
            <Text style={[s.scalingSubtitle, { color: colors.textMuted }]}>Scale ingredients proportionally</Text>
          </View>
          <View style={[s.scalingControls, { backgroundColor: colors.background, borderColor: colors.primaryMuted }]}>
            <Animated.View style={minusAnimStyle}>
              <Pressable
                style={[s.scalingButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPressIn={() => { minusScale.value = withSpring(PressScale.control, PressSpring.control); }}
                onPressOut={() => { minusScale.value = withSpring(1, PressSpring.control); }}
                onPress={() => adjustServings(-1)}
              >
                <MaterialIcons name="remove" size={20} color={colors.primary} />
              </Pressable>
            </Animated.View>
            <View style={s.servingsDisplay}>
              <NumberTicker value={targetServings} style={[s.servingsNumber, { color: colors.text }]} />
              <Text style={[s.servingsLabel, { color: colors.textMuted }]}>Servings</Text>
            </View>
            <Animated.View style={plusAnimStyle}>
              <Pressable
                style={[s.scalingButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPressIn={() => { plusScale.value = withSpring(PressScale.control, PressSpring.control); }}
                onPressOut={() => { plusScale.value = withSpring(1, PressSpring.control); }}
                onPress={() => adjustServings(1)}
              >
                <MaterialIcons name="add" size={20} color={colors.primary} />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Unit System Toggle */}
        <Animated.View entering={FadeInDown.duration(350).delay(150)} style={s.unitToggleSection}>
          <Text style={[s.unitToggleLabel, { color: colors.textSecondary }]}>Unit System</Text>
          <View style={s.unitToggleButtons}>
            {(['metric', 'imperial'] as const).map((system) => {
              const active = unitSystem === system;
              return (
                <Pressable
                  key={system}
                  style={[s.unitToggleButton, { backgroundColor: active ? colors.primary : colors.card }]}
                  onPress={() => {
                    if (unitSystem !== system) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setUnitSystem(system);
                    }
                  }}
                >
                  <Text style={[s.unitToggleButtonText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                    {system.charAt(0).toUpperCase() + system.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Ingredients */}
        {scaledIngredients.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(200)} style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="restaurant" size={16} color={colors.primary} />
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Ingredients</Text>
              {(isScaled || isConverted) && <View style={[s.scaledBadge, { backgroundColor: colors.primaryLight }]}><Text style={[s.scaledBadgeText, { color: colors.primary }]}>Scaled</Text></View>}
            </View>
            <View style={[s.ingredientTable, { borderColor: colors.borderPrimary }]}>
              <View style={[s.ingredientHeaderRow, { backgroundColor: colors.card, borderBottomColor: colors.borderPrimary }]}>
                <Text style={[s.ingredientHeaderCell, s.qtyCol, { color: colors.textMuted }]}>Qty</Text>
                <Text style={[s.ingredientHeaderCell, s.unitCol, { color: colors.textMuted }]}>Unit</Text>
                <Text style={[s.ingredientHeaderCell, { color: colors.textMuted }]}>Ingredient</Text>
                <Text style={[s.ingredientHeaderCell, s.costCol, { color: colors.textMuted }]}>Cost</Text>
              </View>
              {scaledIngredients.map((ing, index) => (
                <View key={index} style={[s.ingredientRow, index % 2 === 1 && { backgroundColor: colors.borderSubtle }]}>
                  <Text style={[s.qtyText, s.qtyCol, { color: colors.primary }]}>{ing.quantity}</Text>
                  <Text style={[s.unitText, s.unitCol, { color: colors.textTertiary }]}>{ing.unit}</Text>
                  <View style={s.ingredientNameCol}>
                    <Text style={[s.ingredientName, { color: colors.text }]}>{ing.name}</Text>
                    {ing.notes && <Text style={[s.ingredientNotes, { color: colors.textMuted }]}>{ing.notes}</Text>}
                  </View>
                  <Text style={[s.costText, s.costCol, { color: recipe.ingredients?.[index]?.cost_per_unit != null ? colors.primary : colors.textMuted }]}>
                    {formatCurrency(calculateScaledCost(
                      recipe.ingredients?.[index]?.cost_per_unit ?? null,
                      ing.quantity
                    ))}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Cost Analysis */}
        {costSummary && costSummary.total_count > 0 && (
          <View style={[s.costSection, { backgroundColor: colors.card, borderColor: colors.borderPrimary }]}>
            <View style={s.costHeader}>
              <MaterialIcons name="attach-money" size={16} color={colors.primary} />
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Cost Analysis</Text>
              {!costSummary.is_complete && (
                <View style={[s.partialBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[s.partialBadgeText, { color: colors.primary }]}>
                    {costSummary.costed_count}/{costSummary.total_count} Costed
                  </Text>
                </View>
              )}
            </View>
            <View style={s.costGrid}>
              <View style={s.costCard}>
                <Text style={[s.costCardLabel, { color: colors.textMuted }]}>Total Cost</Text>
                <Text style={[s.costCardValue, { color: costSummary.is_complete ? colors.primary : colors.textTertiary }]}>
                  {costSummary.is_complete ? formatCurrency(costSummary.total_cost) : formatCurrency(costSummary.total_costed)}
                </Text>
                {!costSummary.is_complete && (
                  <Text style={[s.costCardNote, { color: colors.textMuted }]}>partial</Text>
                )}
              </View>
              <View style={[s.costCard, s.costCardDivider, { borderLeftColor: colors.borderPrimary }]}>
                <Text style={[s.costCardLabel, { color: colors.textMuted }]}>Per Serving</Text>
                <Text style={[s.costCardValue, { color: costSummary.is_complete ? colors.primary : colors.textTertiary }]}>
                  {costSummary.cost_per_serving != null
                    ? formatCurrency(costSummary.cost_per_serving)
                    : '—'}
                </Text>
                {costSummary.cost_per_serving != null && (
                  <Text style={[s.costCardNote, { color: colors.textMuted }]}>
                    {isScaled ? `${targetServings} servings` : `${recipe.servings} servings`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Method */}
        {recipe.steps && recipe.steps.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(300)} style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="assignment" size={16} color={colors.primary} />
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Method</Text>
            </View>
            <View style={s.stepsContainer}>
              {recipe.steps.map((step, index) => (
                <View key={step.id} style={s.stepItem}>
                  <View style={s.stepNumberContainer}>
                    <View style={[s.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={s.stepNumberText}>{step.step_number}</Text>
                    </View>
                    {index < recipe.steps!.length - 1 && <View style={[s.stepLine, { backgroundColor: colors.border }]} />}
                  </View>
                  <View style={s.stepContent}>
                    <Text style={[s.stepInstruction, { color: colors.text }]}>{step.instruction}</Text>
                    {step.timer_seconds && (
                      <View style={s.timerRow}>
                        <MaterialIcons name="timer" size={16} color={colors.primary} />
                        <Text style={[s.timerText, { color: colors.primary }]}>
                          {step.timer_seconds >= 60 ? `${Math.floor(step.timer_seconds / 60)} min` : `${step.timer_seconds} sec`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Plating Photos */}
        <Animated.View entering={FadeInDown.duration(350).delay(400)}>
        <PlatingPhotos
          photos={recipe.plating_photos ?? []}
          onPhotosChange={handlePhotosChange}
          editable
        />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.lg, letterSpacing: -0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  scrollContent: { paddingBottom: 100 },
  titleSection: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xxl, borderBottomWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  recipeTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xxxl, flex: 1, lineHeight: 36 },
  description: { fontFamily: 'Inter_400Regular', fontSize: FontSize.md, lineHeight: 22, marginBottom: Spacing.xxl },
  metaGrid: { flexDirection: 'row', marginTop: Spacing.lg },
  metaItem: { flex: 1 },
  metaDivider: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: Spacing.lg },
  metaLabel: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  metaValue: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md },
  scalingSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  scalingTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.md, textTransform: 'uppercase', letterSpacing: 1 },
  scalingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: FontSize.sm, marginTop: 2, textTransform: 'uppercase', letterSpacing: -0.5 },
  scalingControls: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, padding: 6 },
  scalingButton: { width: 36, height: 36, borderRadius: BorderRadius.sm, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  servingsDisplay: { paddingHorizontal: Spacing.lg, alignItems: 'center', minWidth: 64 },
  servingsNumber: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xl },
  servingsLabel: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, textTransform: 'uppercase' },
  section: { marginTop: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.md, textTransform: 'uppercase', letterSpacing: 2 },
  scaledBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginLeft: Spacing.sm },
  scaledBadgeText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, textTransform: 'uppercase' },
  ingredientTable: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  ingredientHeaderRow: { flexDirection: 'row', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  ingredientHeaderCell: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 2 },
  qtyCol: { width: 64 },
  unitCol: { width: 48 },
  costCol: { width: 64, textAlign: 'right' },
  costText: { fontFamily: 'Inter_500Medium', fontSize: FontSize.md },
  costSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  costGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  costCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  costCardDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.lg,
  },
  costCardLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  costCardValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xxl,
  },
  costCardNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
  },
  partialBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  partialBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
  },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  qtyText: { fontFamily: 'Inter_500Medium', fontSize: FontSize.md },
  unitText: { fontFamily: 'Inter_400Regular', fontSize: FontSize.md },
  ingredientNameCol: { flex: 1 },
  ingredientName: { fontFamily: 'Inter_500Medium', fontSize: FontSize.md },
  ingredientNotes: { fontFamily: 'Inter_400Regular', fontSize: FontSize.sm, fontStyle: 'italic', marginTop: 2 },
  stepsContainer: { paddingHorizontal: Spacing.lg, gap: Spacing.xxl },
  stepItem: { flexDirection: 'row', gap: Spacing.lg },
  stepNumberContainer: { alignItems: 'center' },
  stepNumber: { width: 28, height: 28, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.sm, color: '#FFFFFF' },
  stepLine: { width: 2, flex: 1, marginTop: Spacing.sm },
  stepContent: { flex: 1, paddingBottom: Spacing.sm },
  stepInstruction: { fontFamily: 'Inter_400Regular', fontSize: FontSize.md, lineHeight: 24 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  timerText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.sm },
  unitToggleSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  unitToggleLabel: { fontFamily: 'Inter_700Bold', fontSize: FontSize.xs, textTransform: 'uppercase' as const, letterSpacing: 1.5 },
  unitToggleButtons: { flexDirection: 'row', borderRadius: BorderRadius.md, overflow: 'hidden' as const },
  unitToggleButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, minWidth: 80, alignItems: 'center' as const },
  unitToggleButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.sm },
});
