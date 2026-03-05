import { create } from 'zustand';
import { supabase } from '@/src/lib/supabase';
import type {
  Recipe,
  Collection,
  PrepList,
  PrepItem,
  CollectionFormData,
} from '@/src/types';
import { aggregateIngredients } from '@/src/lib/scaling';

const STATIONS = [
  'Protein & Seafood',
  'Produce & Aromatics',
  'Dairy & Fats',
  'Dry Goods',
] as const;

const STATION_TAGS: Record<string, string> = {
  'Protein & Seafood': 'GRILL',
  'Produce & Aromatics': 'SAUCIER',
  'Dairy & Fats': 'PASTRY',
  'Dry Goods': 'ALL',
};

export { STATIONS, STATION_TAGS };

const STATION_MAP: Record<string, string> = {
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

function assignStation(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, station] of Object.entries(STATION_MAP)) {
    if (lower.includes(keyword)) return station;
  }
  return 'Dry Goods';
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user.id;
}

interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  collection_recipes: { recipe_id: string }[];
}

function collectionFromRow(row: CollectionRow): Collection {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    status: row.status as 'active' | 'draft',
    recipe_ids: (row.collection_recipes ?? []).map((cr) => cr.recipe_id),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

interface PrepListRow {
  id: string;
  user_id: string;
  name: string;
  date: string;
  status: string;
  recipe_ids: string[];
  created_at: string;
  updated_at: string;
  prep_items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    notes: string | null;
    station: string;
    checked: boolean;
  }>;
}

function prepListFromRow(row: PrepListRow): PrepList {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    status: row.status as 'active' | 'completed',
    recipe_ids: row.recipe_ids ?? [],
    items: (row.prep_items ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      notes: i.notes,
      station: i.station,
      checked: i.checked,
    })),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

interface RecipeStore {
  recipes: Recipe[];
  collections: Collection[];
  prepLists: PrepList[];
  isLoaded: boolean;
  searchQuery: string;
  selectedCuisine: string | null;

  initialize: () => Promise<void>;

  setSearchQuery: (query: string) => void;
  setSelectedCuisine: (cuisine: string | null) => void;
  getFilteredRecipes: () => Recipe[];
  getRecipeById: (id: string) => Recipe | undefined;
  addRecipe: (recipe: Recipe) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => void;

  getCollectionById: (id: string) => Collection | undefined;
  getCollectionRecipes: (collectionId: string) => Recipe[];
  addCollection: (data: CollectionFormData) => Promise<string>;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addRecipeToCollection: (collectionId: string, recipeId: string) => void;
  removeRecipeFromCollection: (collectionId: string, recipeId: string) => void;

  togglePrepItem: (listId: string, itemId: string) => void;
  addPrepList: (list: PrepList) => void;
  getPrepListById: (id: string) => PrepList | undefined;
  createPrepListFromRecipes: (
    name: string,
    date: string,
    recipeIds: string[],
  ) => Promise<string>;
  updatePrepList: (id: string, updates: Partial<PrepList>) => void;
  deletePrepList: (id: string) => void;
  addPrepItem: (listId: string, item: PrepItem) => void;
  removePrepItem: (listId: string, itemId: string) => void;
  updatePrepItem: (
    listId: string,
    itemId: string,
    updates: Partial<PrepItem>,
  ) => void;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  collections: [],
  prepLists: [],
  isLoaded: false,
  searchQuery: '',
  selectedCuisine: null,

  initialize: async () => {
    try {
      const userId = await getCurrentUserId();

      const [recipesRes, collectionsRes, prepListsRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, ingredients(*), steps(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('collections')
          .select('*, collection_recipes(recipe_id)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('prep_lists')
          .select('*, prep_items(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      const recipes: Recipe[] = (recipesRes.data ?? []).map((r) => ({
        ...r,
        ingredients: (r.ingredients ?? []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) =>
            a.sort_order - b.sort_order,
        ),
        steps: (r.steps ?? []).sort(
          (a: { step_number: number }, b: { step_number: number }) =>
            a.step_number - b.step_number,
        ),
        plating_photos: r.plating_photos ?? [],
      }));

      const collections = (collectionsRes.data ?? []).map(collectionFromRow);
      const prepLists = (prepListsRes.data ?? []).map(prepListFromRow);

      set({ recipes, collections, prepLists, isLoaded: true });
    } catch (e) {
      console.error('Failed to initialize recipe store:', e);
      set({ isLoaded: true });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCuisine: (cuisine) => set({ selectedCuisine: cuisine }),

  getFilteredRecipes: () => {
    const { recipes, searchQuery, selectedCuisine } = get();
    return recipes.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cuisine?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.ingredients?.some((i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const matchesCuisine =
        !selectedCuisine || r.cuisine === selectedCuisine;
      return matchesSearch && matchesCuisine;
    });
  },

  getRecipeById: (id) => get().recipes.find((r) => r.id === id),

  // ─── Recipes ───────────────────────────────────────────────

  addRecipe: async (recipe) => {
    const userId = await getCurrentUserId();

    const { data: row, error } = await supabase
      .from('recipes')
      .insert({
        user_id: userId,
        title: recipe.title,
        cuisine: recipe.cuisine,
        servings: recipe.servings,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        description: recipe.description,
        image_url: recipe.image_url,
        plating_photos: recipe.plating_photos ?? [],
      })
      .select()
      .single();

    if (error || !row) throw error ?? new Error('Insert failed');

    let ingredients: Recipe['ingredients'] = [];
    if (recipe.ingredients?.length) {
      const { data, error: ie } = await supabase
        .from('ingredients')
        .insert(
          recipe.ingredients.map((ing, i) => ({
            recipe_id: row.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            cost_per_unit: ing.cost_per_unit,
            sort_order: ing.sort_order ?? i,
          })),
        )
        .select();
      if (ie) throw ie;
      ingredients = data ?? [];
    }

    let steps: Recipe['steps'] = [];
    if (recipe.steps?.length) {
      const { data, error: se } = await supabase
        .from('steps')
        .insert(
          recipe.steps.map((s, i) => ({
            recipe_id: row.id,
            step_number: s.step_number ?? i + 1,
            instruction: s.instruction,
            timer_seconds: s.timer_seconds,
          })),
        )
        .select();
      if (se) throw se;
      steps = data ?? [];
    }

    const full: Recipe = {
      ...row,
      ingredients: (ingredients ?? []).sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
      steps: (steps ?? []).sort((a, b) => a.step_number - b.step_number),
      plating_photos: row.plating_photos ?? [],
    };

    set((state) => ({ recipes: [full, ...state.recipes] }));
  },

  updateRecipe: async (id, updates) => {
    const scalarFields: Record<string, unknown> = {};
    for (const key of [
      'title',
      'cuisine',
      'servings',
      'prep_time',
      'cook_time',
      'description',
      'image_url',
      'plating_photos',
    ] as const) {
      if (key in updates)
        scalarFields[key] = updates[key as keyof typeof updates];
    }

    if (Object.keys(scalarFields).length) {
      const { error } = await supabase
        .from('recipes')
        .update(scalarFields)
        .eq('id', id);
      if (error) throw error;
    }

    if (updates.ingredients) {
      await supabase.from('ingredients').delete().eq('recipe_id', id);
      if (updates.ingredients.length) {
        const { error } = await supabase.from('ingredients').insert(
          updates.ingredients.map((ing, i) => ({
            recipe_id: id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            cost_per_unit: ing.cost_per_unit,
            sort_order: ing.sort_order ?? i,
          })),
        );
        if (error) throw error;
      }
    }

    if (updates.steps) {
      await supabase.from('steps').delete().eq('recipe_id', id);
      if (updates.steps.length) {
        const { error } = await supabase.from('steps').insert(
          updates.steps.map((s, i) => ({
            recipe_id: id,
            step_number: s.step_number ?? i + 1,
            instruction: s.instruction,
            timer_seconds: s.timer_seconds,
          })),
        );
        if (error) throw error;
      }
    }

    const { data: refreshed } = await supabase
      .from('recipes')
      .select('*, ingredients(*), steps(*)')
      .eq('id', id)
      .single();

    if (refreshed) {
      const recipe: Recipe = {
        ...refreshed,
        ingredients: (refreshed.ingredients ?? []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) =>
            a.sort_order - b.sort_order,
        ),
        steps: (refreshed.steps ?? []).sort(
          (a: { step_number: number }, b: { step_number: number }) =>
            a.step_number - b.step_number,
        ),
        plating_photos: refreshed.plating_photos ?? [],
      };
      set((state) => ({
        recipes: state.recipes.map((r) => (r.id === id ? recipe : r)),
      }));
    }
  },

  deleteRecipe: (id) => {
    const prev = get().recipes;
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
    }));
    supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete recipe:', error);
          set({ recipes: prev });
        }
      });
  },

  // ─── Collections ───────────────────────────────────────────

  getCollectionById: (id) => get().collections.find((c) => c.id === id),

  getCollectionRecipes: (collectionId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return [];
    return get().recipes.filter((r) => col.recipe_ids.includes(r.id));
  },

  addCollection: async (data) => {
    const userId = await getCurrentUserId();
    const { data: row, error } = await supabase
      .from('collections')
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        status: data.status,
      })
      .select()
      .single();

    if (error || !row) {
      console.error('Failed to add collection:', error);
      return '';
    }

    const collection: Collection = {
      ...row,
      status: row.status as 'active' | 'draft',
      recipe_ids: [],
    };
    set((state) => ({
      collections: [collection, ...state.collections],
    }));
    return row.id;
  },

  updateCollection: (id, updates) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    }));
    const dbUpdates: Record<string, unknown> = {};
    for (const key of [
      'name',
      'description',
      'color',
      'icon',
      'status',
    ] as const) {
      if (key in updates)
        dbUpdates[key] = updates[key as keyof typeof updates];
    }
    if (Object.keys(dbUpdates).length) {
      supabase
        .from('collections')
        .update(dbUpdates)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Failed to update collection:', error);
        });
    }
  },

  deleteCollection: (id) => {
    const prev = get().collections;
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
    }));
    supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete collection:', error);
          set({ collections: prev });
        }
      });
  },

  addRecipeToCollection: (collectionId, recipeId) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === collectionId && !c.recipe_ids.includes(recipeId)
          ? { ...c, recipe_ids: [...c.recipe_ids, recipeId] }
          : c,
      ),
    }));
    supabase
      .from('collection_recipes')
      .insert({ collection_id: collectionId, recipe_id: recipeId })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to add recipe to collection:', error);
          set((state) => ({
            collections: state.collections.map((c) =>
              c.id === collectionId
                ? {
                    ...c,
                    recipe_ids: c.recipe_ids.filter(
                      (rid) => rid !== recipeId,
                    ),
                  }
                : c,
            ),
          }));
        }
      });
  },

  removeRecipeFromCollection: (collectionId, recipeId) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              recipe_ids: c.recipe_ids.filter((rid) => rid !== recipeId),
            }
          : c,
      ),
    }));
    supabase
      .from('collection_recipes')
      .delete()
      .eq('collection_id', collectionId)
      .eq('recipe_id', recipeId)
      .then(({ error }) => {
        if (error)
          console.error('Failed to remove recipe from collection:', error);
      });
  },

  // ─── Prep Lists ────────────────────────────────────────────

  togglePrepItem: (listId, itemId) => {
    const list = get().prepLists.find((pl) => pl.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    if (!item) return;

    const newChecked = !item.checked;
    set((state) => ({
      prepLists: state.prepLists.map((pl) =>
        pl.id === listId
          ? {
              ...pl,
              items: pl.items.map((i) =>
                i.id === itemId ? { ...i, checked: newChecked } : i,
              ),
            }
          : pl,
      ),
    }));
    supabase
      .from('prep_items')
      .update({ checked: newChecked })
      .eq('id', itemId)
      .then(({ error }) => {
        if (error) console.error('Failed to toggle prep item:', error);
      });
  },

  addPrepList: (list) =>
    set((state) => ({ prepLists: [list, ...state.prepLists] })),

  getPrepListById: (id) => get().prepLists.find((pl) => pl.id === id),

  createPrepListFromRecipes: async (name, date, recipeIds) => {
    const userId = await getCurrentUserId();
    const { recipes } = get();
    const selectedRecipes = recipes.filter((r) => recipeIds.includes(r.id));
    const allIngredients = selectedRecipes.flatMap(
      (r) => r.ingredients ?? [],
    );
    const aggregated = aggregateIngredients(allIngredients);

    const { data: listRow, error: listError } = await supabase
      .from('prep_lists')
      .insert({
        user_id: userId,
        name,
        date,
        status: 'active',
        recipe_ids: recipeIds,
      })
      .select()
      .single();

    if (listError || !listRow) throw listError ?? new Error('Insert failed');

    const itemInserts = aggregated.map((agg) => ({
      prep_list_id: listRow.id,
      name: agg.name.charAt(0).toUpperCase() + agg.name.slice(1),
      quantity: agg.quantity,
      unit: agg.unit,
      notes: null as string | null,
      station: assignStation(agg.name),
      checked: false,
    }));

    let items: PrepItem[] = [];
    if (itemInserts.length) {
      const { data, error } = await supabase
        .from('prep_items')
        .insert(itemInserts)
        .select();
      if (error) throw error;
      items = (data ?? []).map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes,
        station: i.station,
        checked: i.checked,
      }));
    }

    const prepList: PrepList = {
      id: listRow.id,
      name: listRow.name,
      date: listRow.date,
      status: listRow.status as 'active' | 'completed',
      recipe_ids: listRow.recipe_ids ?? [],
      items,
      created_at: listRow.created_at,
      updated_at: listRow.updated_at,
    };

    set((state) => ({ prepLists: [prepList, ...state.prepLists] }));
    return listRow.id;
  },

  updatePrepList: (id, updates) => {
    set((state) => ({
      prepLists: state.prepLists.map((pl) =>
        pl.id === id ? { ...pl, ...updates } : pl,
      ),
    }));
    const dbUpdates: Record<string, unknown> = {};
    for (const key of ['name', 'date', 'status'] as const) {
      if (key in updates)
        dbUpdates[key] = updates[key as keyof typeof updates];
    }
    if (Object.keys(dbUpdates).length) {
      supabase
        .from('prep_lists')
        .update(dbUpdates)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Failed to update prep list:', error);
        });
    }
  },

  deletePrepList: (id) => {
    const prev = get().prepLists;
    set((state) => ({
      prepLists: state.prepLists.filter((pl) => pl.id !== id),
    }));
    supabase
      .from('prep_lists')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete prep list:', error);
          set({ prepLists: prev });
        }
      });
  },

  addPrepItem: (listId, item) => {
    set((state) => ({
      prepLists: state.prepLists.map((pl) =>
        pl.id === listId
          ? { ...pl, items: [...pl.items, item] }
          : pl,
      ),
    }));
    supabase
      .from('prep_items')
      .insert({
        prep_list_id: listId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        station: item.station,
        checked: item.checked,
      })
      .then(({ error }) => {
        if (error) console.error('Failed to add prep item:', error);
      });
  },

  removePrepItem: (listId, itemId) => {
    set((state) => ({
      prepLists: state.prepLists.map((pl) =>
        pl.id === listId
          ? { ...pl, items: pl.items.filter((i) => i.id !== itemId) }
          : pl,
      ),
    }));
    supabase
      .from('prep_items')
      .delete()
      .eq('id', itemId)
      .then(({ error }) => {
        if (error) console.error('Failed to remove prep item:', error);
      });
  },

  updatePrepItem: (listId, itemId, updates) => {
    set((state) => ({
      prepLists: state.prepLists.map((pl) =>
        pl.id === listId
          ? {
              ...pl,
              items: pl.items.map((i) =>
                i.id === itemId ? { ...i, ...updates } : i,
              ),
            }
          : pl,
      ),
    }));
    const dbUpdates: Record<string, unknown> = {};
    for (const key of [
      'name',
      'quantity',
      'unit',
      'notes',
      'station',
      'checked',
    ] as const) {
      if (key in updates)
        dbUpdates[key] = updates[key as keyof typeof updates];
    }
    if (Object.keys(dbUpdates).length) {
      supabase
        .from('prep_items')
        .update(dbUpdates)
        .eq('id', itemId)
        .then(({ error }) => {
          if (error) console.error('Failed to update prep item:', error);
        });
    }
  },
}));
