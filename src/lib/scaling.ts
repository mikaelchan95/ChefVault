import type { Ingredient } from '@/src/types';

const UNIT_THRESHOLDS: Record<string, { target: string; factor: number }> = {
  g: { target: 'kg', factor: 1000 },
  ml: { target: 'L', factor: 1000 },
};

/**
 * Rounds to practical kitchen values: whole numbers for large quantities,
 * one decimal for small, and fractions of 0.25 for tiny amounts.
 */
function kitchenRound(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 2) / 2;
  if (value >= 1) return Math.round(value * 4) / 4;
  return Math.round(value * 10) / 10;
}

export interface ScaledIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  originalQuantity: number;
  originalUnit: string;
}

/**
 * Scales an ingredient's quantity proportionally and applies unit conversion
 * when thresholds are crossed (e.g., 1500g → 1.5kg).
 */
export function scaleIngredient(
  ingredient: Ingredient,
  baseServings: number,
  targetServings: number,
): ScaledIngredient {
  const ratio = targetServings / baseServings;
  let scaledQty = ingredient.quantity * ratio;
  let unit = ingredient.unit;

  const threshold = UNIT_THRESHOLDS[unit];
  if (threshold && scaledQty >= threshold.factor) {
    scaledQty = scaledQty / threshold.factor;
    unit = threshold.target;
  }

  return {
    name: ingredient.name,
    quantity: kitchenRound(scaledQty),
    unit,
    notes: ingredient.notes,
    originalQuantity: ingredient.quantity,
    originalUnit: ingredient.unit,
  };
}

/**
 * Scales all ingredients in a recipe to a target serving count.
 */
export function scaleRecipeIngredients(
  ingredients: Ingredient[],
  baseServings: number,
  targetServings: number,
): ScaledIngredient[] {
  return ingredients.map((ing) => scaleIngredient(ing, baseServings, targetServings));
}

/**
 * Aggregates ingredients across recipes by name + unit, summing quantities.
 * Used for prep list generation.
 */
export function aggregateIngredients(
  allIngredients: Ingredient[],
): { name: string; quantity: number; unit: string }[] {
  const map = new Map<string, { quantity: number; unit: string }>();

  for (const ing of allIngredients) {
    const key = `${ing.name.toLowerCase()}|${ing.unit}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += ing.quantity;
    } else {
      map.set(key, { quantity: ing.quantity, unit: ing.unit });
    }
  }

  return Array.from(map.entries())
    .map(([key, val]) => ({
      name: key.split('|')[0]!,
      quantity: kitchenRound(val.quantity),
      unit: val.unit,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
