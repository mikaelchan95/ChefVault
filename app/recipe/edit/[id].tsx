import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing } from '@/src/constants/theme';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { RecipeForm, type RecipeFormData } from '@/src/components/RecipeForm';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const recipe = useRecipeStore((s) => s.getRecipeById(id!));
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);

  const initialValues = useMemo(() => {
    if (!recipe) return undefined;
    return {
      title: recipe.title,
      cuisine: recipe.cuisine ?? '',
      servings: String(recipe.servings),
      prepTime: recipe.prep_time ? String(recipe.prep_time) : '',
      cookTime: recipe.cook_time ? String(recipe.cook_time) : '',
      description: recipe.description ?? '',
      ingredients: (recipe.ingredients ?? []).map((i) => ({
        name: i.name,
        quantity: String(i.quantity),
        unit: i.unit,
        notes: i.notes ?? '',
        cost: i.cost_per_unit != null ? String(i.cost_per_unit) : '',
      })),
      steps: (recipe.steps ?? []).map((s) => ({
        instruction: s.instruction,
        timer_minutes: s.timer_seconds ? String(Math.round(s.timer_seconds / 60)) : '',
      })),
      platingPhotos: recipe.plating_photos ?? [],
    };
  }, [recipe]);

  const handleSave = useCallback(
    async (data: RecipeFormData) => {
      await updateRecipe(id!, data);
    },
    [id, updateRecipe],
  );

  if (!recipe) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.surface }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Recipe not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: Spacing.lg }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md, color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <RecipeForm
      initialValues={initialValues}
      onSave={handleSave}
      headerTitle="Edit Recipe"
      saveButtonText="Save Recipe"
      successMessage="Recipe updated"
      errorMessage="Failed to save changes"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.lg },
});
