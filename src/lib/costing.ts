import type { Ingredient } from '@/src/types';

export interface IngredientCost {
  name: string;
  cost: number | null;
}

export interface RecipeCostSummary {
  ingredients: IngredientCost[];
  total_cost: number | null;
  total_costed: number;
  cost_per_serving: number | null;
  costed_count: number;
  total_count: number;
  is_complete: boolean;
}

/**
 * Calculates recipe cost summary from ingredients and serving count.
 */
export function calculateRecipeCost(ingredients: Ingredient[], servings: number): RecipeCostSummary {
  const total_count = ingredients.length;
  let total_costed = 0;
  let costed_count = 0;

  const ingredientsCosts: IngredientCost[] = ingredients.map((ing) => {
    const cost = ing.cost_per_unit != null ? ing.cost_per_unit * ing.quantity : null;
    if (cost != null) {
      total_costed += cost;
      costed_count++;
    }
    return { name: ing.name, cost };
  });

  const is_complete = costed_count === total_count && total_count > 0;
  const total_cost = is_complete ? total_costed : null;
  const cost_per_serving =
    total_cost != null && servings > 0 ? total_cost / servings : total_costed > 0 && servings > 0 ? total_costed / servings : null;

  return {
    ingredients: ingredientsCosts,
    total_cost,
    total_costed,
    cost_per_serving,
    costed_count,
    total_count,
    is_complete,
  };
}

/**
 * Formats a numeric amount as currency string.
 */
export function formatCurrency(amount: number | null, currency = 'USD'): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculates scaled cost: costPerUnit * scaledQuantity.
 */
export function calculateScaledCost(costPerUnit: number | null, scaledQuantity: number): number | null {
  if (costPerUnit == null || Number.isNaN(costPerUnit) || Number.isNaN(scaledQuantity)) return null;
  return costPerUnit * scaledQuantity;
}
