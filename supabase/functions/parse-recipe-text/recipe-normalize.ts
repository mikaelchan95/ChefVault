export type RecipeDraft = Record<string, unknown>;

export function assertTranscript(text: unknown): string {
  const cleaned = String(text ?? "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 24) {
    throw new Error("Say a little more so ChefVault can build a recipe draft.");
  }
  return cleaned.slice(0, 24000);
}

function asArray(v: unknown): unknown[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeRecipe(recipe: RecipeDraft | null): Record<string, unknown> {
  const r = recipe ?? {};
  const ingredients = asArray(r.ingredients).map((i) => {
    const o = i as Record<string, unknown>;
    return {
      name: String(o.name ?? "").trim(),
      quantity: toNum(o.quantity, 1),
      unit: String(o.unit ?? "").trim(),
      notes: o.notes ? String(o.notes).trim() : null,
    };
  }).filter((i) => i.name.length > 0);

  const steps = asArray(r.steps).map((s) => {
    const o = s as Record<string, unknown>;
    return {
      instruction: String(o.instruction ?? "").trim(),
      timer_seconds: toInt(o.timer_seconds),
    };
  }).filter((s) => s.instruction.length > 0);

  if (ingredients.length === 0 && steps.length === 0) {
    throw new Error("Couldn't extract a recipe draft from that transcript.");
  }

  return {
    title: String(r.title ?? "Voice recipe").trim() || "Voice recipe",
    cuisine: r.cuisine ? String(r.cuisine).trim() : null,
    servings: Math.max(1, toInt(r.servings) ?? 1),
    prep_time: r.prep_time != null ? toInt(r.prep_time) : null,
    cook_time: r.cook_time != null ? toInt(r.cook_time) : null,
    description: r.description ? String(r.description).trim() : null,
    image_url: null,
    source_url: null,
    ingredients,
    steps,
    warnings: [
      "Created from voice - please check quantities and steps.",
      ...asArray(r.warnings).map((w) => String(w)).filter(Boolean),
    ],
  };
}
