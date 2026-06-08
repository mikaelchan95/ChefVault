import { assertTranscript, normalizeRecipe } from "./recipe-normalize.ts";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_PROMPT =
  "You are a precise recipe drafter for a professional kitchen app. " +
  "From a spoken transcript, extract one recipe. Use only details the speaker gave. " +
  "Give numeric quantities and units where stated. Keep steps short and ordered. " +
  "If a value is missing, omit it and add a short warning. Respond in English.";

const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    cuisine: { type: "string", nullable: true },
    servings: { type: "integer" },
    prep_time: { type: "integer", nullable: true },
    cook_time: { type: "integer", nullable: true },
    description: { type: "string", nullable: true },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          notes: { type: "string", nullable: true },
        },
        required: ["name"],
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          instruction: { type: "string" },
          timer_seconds: { type: "integer", nullable: true },
        },
        required: ["instruction"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["title", "ingredients", "steps"],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Sign in before creating a recipe from voice." }, 401);
  }

  let transcript = "";
  try {
    transcript = assertTranscript((await req.json())?.text);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Provide a recipe transcript." }, 400);
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return json({ error: "GEMINI_API_KEY is not configured." }, 500);

  try {
    const recipe = await geminiExtract(geminiKey, transcript);
    return json(normalizeRecipe(recipe));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function geminiExtract(key: string, transcript: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Create a structured recipe draft from this spoken transcript:\n\n${transcript}`,
          }],
        }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RECIPE_SCHEMA,
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason;
    throw new Error(reason ? `The parser returned no recipe (${reason}).` : "The parser returned no recipe.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Could not parse the generated recipe.");
  }
}
