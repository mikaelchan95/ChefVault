import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertTranscript, normalizeRecipe } from "./recipe-normalize.ts";

Deno.test("assertTranscript rejects short transcript", () => {
  assertThrows(() => assertTranscript("salt"), Error, "Say a little more");
});

Deno.test("normalizeRecipe returns safe draft", () => {
  const out = normalizeRecipe({
    title: "Tomato Pasta",
    servings: "4",
    ingredients: [{ name: "Tomatoes", quantity: "500", unit: "g" }],
    steps: [{ instruction: "Cook the pasta.", timer_seconds: 600.4 }],
    warnings: ["Check salt."],
  });

  assertEquals(out.title, "Tomato Pasta");
  assertEquals(out.servings, 4);
  assertEquals((out.ingredients as Array<Record<string, unknown>>)[0].quantity, 500);
  assertEquals((out.steps as Array<Record<string, unknown>>)[0].timer_seconds, 600);
  assertEquals((out.warnings as string[])[0], "Created from voice - please check quantities and steps.");
  assertEquals((out.warnings as string[])[1], "Check salt.");
});

Deno.test("normalizeRecipe rejects empty drafts", () => {
  assertThrows(() => normalizeRecipe({ title: "", ingredients: [], steps: [] }), Error, "Couldn't extract");
});
