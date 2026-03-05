export interface User {
  id: string;
  email: string;
  name: string;
  title: string | null;
  plan: 'free' | 'pro';
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  cuisine: string | null;
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  description: string | null;
  image_url: string | null;
  plating_photos: string[];
  created_at: string;
  updated_at: string;
  ingredients?: Ingredient[];
  steps?: Step[];
}

export interface Ingredient {
  id: string;
  recipe_id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  cost_per_unit: number | null;
  sort_order: number;
}

export interface Step {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
  timer_seconds: number | null;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: 'active' | 'draft';
  recipe_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CollectionRecipe {
  collection_id: string;
  recipe_id: string;
}

export type CollectionFormData = Pick<Collection, 'name' | 'description' | 'color' | 'icon' | 'status'>;

export type PrepItemStatus = 'pending' | 'in_progress' | 'completed';

export interface PrepItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  station: string;
  checked: boolean;
}

export interface PrepList {
  id: string;
  name: string;
  date: string;
  status: 'active' | 'completed';
  recipe_ids: string[];
  items: PrepItem[];
  created_at: string;
  updated_at: string;
}

export type PrepListFormData = Pick<PrepList, 'name' | 'date' | 'recipe_ids'>;

export interface AggregatedIngredient {
  name: string;
  total_quantity: number;
  unit: string;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
  ingredients: Omit<Ingredient, 'id' | 'recipe_id'>[];
  steps: Omit<Step, 'id' | 'recipe_id'>[];
};

export type CuisineType =
  | 'French'
  | 'Italian'
  | 'Japanese'
  | 'Asian'
  | 'American'
  | 'Mexican'
  | 'Indian'
  | 'Mediterranean'
  | 'Fusion'
  | 'Pastry'
  | 'Other';

export type UnitType = 'g' | 'kg' | 'ml' | 'L' | 'pc' | 'tbsp' | 'tsp' | 'cup' | 'oz' | 'lb';

export const UNITS: UnitType[] = ['g', 'kg', 'ml', 'L', 'pc', 'tbsp', 'tsp', 'cup', 'oz', 'lb'];

export const CUISINES: CuisineType[] = [
  'French', 'Italian', 'Japanese', 'Asian', 'American',
  'Mexican', 'Indian', 'Mediterranean', 'Fusion', 'Pastry', 'Other',
];
