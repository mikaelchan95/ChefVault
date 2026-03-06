import type { Ingredient } from '@/src/types';

type MeasurementSystem = 'metric' | 'imperial';
type UnitCategory = 'weight' | 'volume' | 'neutral';

interface UnitMeta {
  system: MeasurementSystem | 'neutral';
  category: UnitCategory;
  toBase: number; // factor to convert to base unit (g for weight, ml for volume)
}

const UNIT_META: Record<string, UnitMeta> = {
  g: { system: 'metric', category: 'weight', toBase: 1 },
  kg: { system: 'metric', category: 'weight', toBase: 1000 },
  oz: { system: 'imperial', category: 'weight', toBase: 28.3495 },
  lb: { system: 'imperial', category: 'weight', toBase: 453.592 },
  ml: { system: 'metric', category: 'volume', toBase: 1 },
  L: { system: 'metric', category: 'volume', toBase: 1000 },
  tsp: { system: 'imperial', category: 'volume', toBase: 4.929 },
  tbsp: { system: 'imperial', category: 'volume', toBase: 14.787 },
  cup: { system: 'imperial', category: 'volume', toBase: 236.588 },
  pc: { system: 'neutral', category: 'neutral', toBase: 1 },
};

function kitchenRound(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 2) / 2;
  if (value >= 1) return Math.round(value * 4) / 4;
  return Math.round(value * 10) / 10;
}

function selectBestUnit(
  baseValue: number,
  category: UnitCategory,
  targetSystem: MeasurementSystem,
): { quantity: number; unit: string } {
  if (category === 'weight') {
    if (targetSystem === 'imperial') {
      const oz = baseValue / UNIT_META.oz.toBase;
      if (oz < 16) return { quantity: oz, unit: 'oz' };
      return { quantity: baseValue / UNIT_META.lb.toBase, unit: 'lb' };
    }
    if (baseValue < 1000) return { quantity: baseValue, unit: 'g' };
    return { quantity: baseValue / 1000, unit: 'kg' };
  }

  if (category === 'volume') {
    if (targetSystem === 'imperial') {
      const tsp = baseValue / UNIT_META.tsp.toBase;
      if (tsp < UNIT_META.tbsp.toBase / UNIT_META.tsp.toBase)
        return { quantity: tsp, unit: 'tsp' };
      const tbsp = baseValue / UNIT_META.tbsp.toBase;
      if (tbsp < UNIT_META.cup.toBase / UNIT_META.tbsp.toBase)
        return { quantity: tbsp, unit: 'tbsp' };
      return { quantity: baseValue / UNIT_META.cup.toBase, unit: 'cup' };
    }
    if (baseValue < 1000) return { quantity: baseValue, unit: 'ml' };
    return { quantity: baseValue / 1000, unit: 'L' };
  }

  return { quantity: baseValue, unit: 'pc' };
}

function promoteMetric(quantity: number, unit: string): { quantity: number; unit: string } {
  if (unit === 'g' && quantity >= 1000) return { quantity: quantity / 1000, unit: 'kg' };
  if (unit === 'ml' && quantity >= 1000) return { quantity: quantity / 1000, unit: 'L' };
  return { quantity, unit };
}

export function convertToSystem(
  quantity: number,
  unit: string,
  targetSystem: MeasurementSystem,
): { quantity: number; unit: string } {
  const meta = UNIT_META[unit];
  if (!meta || meta.system === 'neutral') return { quantity, unit };
  if (meta.system === targetSystem) {
    if (targetSystem === 'metric') return promoteMetric(quantity, unit);
    return { quantity, unit };
  }

  const baseValue = quantity * meta.toBase;
  const converted = selectBestUnit(baseValue, meta.category, targetSystem);

  if (targetSystem === 'metric') {
    return promoteMetric(converted.quantity, converted.unit);
  }
  return converted;
}

export interface ScaledIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  originalQuantity: number;
  originalUnit: string;
}

export function scaleIngredient(
  ingredient: Ingredient,
  baseServings: number,
  targetServings: number,
  preferredSystem?: MeasurementSystem,
): ScaledIngredient {
  const ratio = targetServings / baseServings;
  let scaledQty = ingredient.quantity * ratio;
  let unit = ingredient.unit;

  if (preferredSystem) {
    const result = convertToSystem(scaledQty, unit, preferredSystem);
    scaledQty = result.quantity;
    unit = result.unit;
  } else {
    const promoted = promoteMetric(scaledQty, unit);
    scaledQty = promoted.quantity;
    unit = promoted.unit;
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

export function scaleRecipeIngredients(
  ingredients: Ingredient[],
  baseServings: number,
  targetServings: number,
  preferredSystem?: MeasurementSystem,
): ScaledIngredient[] {
  return ingredients.map((ing) =>
    scaleIngredient(ing, baseServings, targetServings, preferredSystem),
  );
}

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
