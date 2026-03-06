import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useAuthStore } from '@/src/stores/authStore';

export async function exportUserData(): Promise<void> {
  const { recipes, collections, prepLists } = useRecipeStore.getState();
  const { profile } = useAuthStore.getState();

  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    profile: profile ? {
      name: profile.name,
      title: profile.title,
      default_units: profile.default_units,
      language: profile.language,
    } : null,
    recipes: recipes.map((r) => ({
      title: r.title,
      cuisine: r.cuisine,
      servings: r.servings,
      prep_time: r.prep_time,
      cook_time: r.cook_time,
      description: r.description,
      image_url: r.image_url,
      plating_photos: r.plating_photos,
      ingredients: (r.ingredients ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes,
        cost_per_unit: i.cost_per_unit,
        sort_order: i.sort_order,
      })),
      steps: (r.steps ?? []).map((s) => ({
        step_number: s.step_number,
        instruction: s.instruction,
        timer_seconds: s.timer_seconds,
      })),
    })),
    collections: collections.map((c) => ({
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      status: c.status,
      recipe_ids: c.recipe_ids,
    })),
    prep_lists: prepLists.map((pl) => ({
      name: pl.name,
      date: pl.date,
      status: pl.status,
      items: pl.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes,
        station: i.station,
        checked: i.checked,
      })),
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const fileName = `chefvault-export-${new Date().toISOString().split('T')[0]}.json`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Export ChefVault Data',
      UTI: 'public.json',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
