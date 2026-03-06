import { useCallback } from 'react';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { RecipeForm, type RecipeFormData } from '@/src/components/RecipeForm';
import type { Recipe } from '@/src/types';

export default function CreateRecipeScreen() {
  const addRecipe = useRecipeStore((s) => s.addRecipe);

  const handleSave = useCallback(
    async (data: RecipeFormData) => {
      const recipe: Recipe = {
        id: '',
        user_id: '',
        image_url: null,
        created_at: '',
        updated_at: '',
        ...data,
      };
      await addRecipe(recipe);
    },
    [addRecipe],
  );

  return (
    <RecipeForm
      onSave={handleSave}
      headerTitle="New Recipe"
      saveButtonText="Save Recipe"
      successMessage="Recipe created"
      errorMessage="Failed to save recipe"
    />
  );
}
