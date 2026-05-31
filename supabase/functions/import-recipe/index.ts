// import-recipe: turn a shared URL (TikTok / Instagram / YouTube / recipe blog)
// into a structured recipe DRAFT for the user to review (nothing is saved here).
// Runs server-side so all keys stay in Supabase secrets, never in the app.
//
// Secrets (set with `supabase secrets set …`):
//   GEMINI_API_KEY    — required. Powers video "watching" + text structuring (Gemini).
//   RESOLVER_API_KEY  — Apify token, to resolve TikTok/IG share links → media + caption.
//                       Actor auto-picked per platform (RESOLVER_ACTORS); override w/ RESOLVER_ACTOR.
//   FIRECRAWL_API_KEY — optional but recommended. Scrapes recipe blogs (handles JS + bot walls
//                       that block a plain fetch). Falls back to direct fetch if absent.
//
// Video path: resolve → fetch bytes transiently → small clips go inline, larger ones via the
// Gemini File API (upload → poll until ACTIVE → reference). Media is never re-hosted; only the
// extracted recipe + source_url persist. verify_jwt = true (see config.toml).

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_UPLOAD = "https://generativelanguage.googleapis.com/upload/v1beta/files";
// Inline base64 inflates ~33%, and Gemini caps a generateContent request near 20MB total —
// so anything above this goes through the File API instead.
const INLINE_LIMIT = 12 * 1024 * 1024;

// Default Apify actors per platform. Override with the RESOLVER_ACTOR env (~ form).
const RESOLVER_ACTORS: Record<string, string> = {
  tiktok: "clockworks~tiktok-scraper",
  instagram: "apify~instagram-scraper",
};

const SYSTEM_PROMPT =
  "You are a precise recipe extractor. From the provided cooking video and/or its caption, " +
  "or an article, extract a single recipe. Give numeric quantities and units where stated; " +
  "keep steps short and ordered. Do NOT invent ingredients or steps that aren't present. " +
  "If a value can't be determined, omit it and add a short note to `warnings`. Respond in English.";

// Gemini responseSchema — property names are snake_case so the JSON matches the app wire shape.
const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    cuisine: { type: "string", nullable: true },
    servings: { type: "integer" },
    prep_time: { type: "integer", nullable: true, description: "minutes" },
    cook_time: { type: "integer", nullable: true, description: "minutes" },
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

function classify(url: string): "youtube" | "tiktok" | "instagram" | "article" {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com")) return "instagram";
  return "article";
}

Deno.serve(async (req) => {
  let url: string | undefined;
  try {
    url = (await req.json())?.url;
  } catch { /* ignore */ }
  if (!url || !/^https?:\/\//i.test(url)) return json({ error: "Provide a valid URL." }, 400);

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return json({ error: "GEMINI_API_KEY is not configured." }, 500);

  const warnings: string[] = [];
  try {
    const kind = classify(url);
    let recipe: Record<string, unknown> | null = null;

    if (kind === "article") {
      const { html, text } = await scrapeArticle(url, warnings);
      const jsonld = extractRecipeJsonLd(html);
      if (jsonld) {
        recipe = mapJsonLdRecipe(jsonld); // structured data → no LLM needed
      } else {
        const body = (text || readable(html)).slice(0, 24000);
        if (!body) return json({ error: "Couldn't read this page.", warnings }, 422);
        recipe = await geminiExtract(geminiKey, [
          { text: `Extract the recipe from this article:\n\n${body}` },
        ], warnings);
      }
    } else if (kind === "youtube") {
      // Gemini can fetch a YouTube URL directly — no resolver/download needed.
      recipe = await geminiExtract(geminiKey, [
        { file_data: { file_uri: url } },
        { text: "Watch this cooking video and extract the recipe (ingredients, steps, times)." },
      ], warnings);
    } else {
      // TikTok / Instagram: resolve the share link → media + caption, then let Gemini watch it.
      const { videoUrl, caption } = await resolveVideo(url, kind, warnings);
      if (videoUrl) {
        const bytes = await fetchBytes(videoUrl);
        const videoPart = bytes.byteLength <= INLINE_LIMIT
          ? { inline_data: { mime_type: "video/mp4", data: encodeBase64(bytes) } }
          : { file_data: { mime_type: "video/mp4", file_uri: await uploadVideoToGemini(geminiKey, bytes) } };
        recipe = await geminiExtract(geminiKey, [
          videoPart,
          { text: `Caption: ${caption || "(none)"}\nWatch this cooking video (read on-screen text too) and extract the recipe.` },
        ], warnings);
      } else if (caption) {
        warnings.push("Couldn't read the video itself; extracted from the caption only.");
        recipe = await geminiExtract(geminiKey, [{ text: captionPrompt(caption) }], warnings);
      } else {
        return json({ error: "Couldn't read a recipe from this link.", warnings }, 422);
      }
    }

    return json({ ...normalize(recipe), source_url: url, warnings });
  } catch (e) {
    return json({ error: (e instanceof Error ? e.message : String(e)), warnings }, 500);
  }
});

function captionPrompt(caption: string): string {
  return `Extract the recipe from this social post caption:\n\n${caption}`;
}

// ---- Gemini ----

async function geminiExtract(
  key: string,
  parts: unknown[],
  warnings: string[],
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RECIPE_SCHEMA,
          temperature: 0.2,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    warnings.push("The model returned no recipe.");
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    warnings.push("Could not parse the extracted recipe.");
    return {};
  }
}

// Upload video bytes to the Gemini File API (resumable), wait until ACTIVE, return the file URI.
// Used for clips too large for an inline request.
async function uploadVideoToGemini(key: string, bytes: Uint8Array, mime = "video/mp4"): Promise<string> {
  const start = await fetch(`${GEMINI_UPLOAD}?key=${key}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": mime,
      "content-type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "chefvault-import" } }),
  });
  if (!start.ok) throw new Error(`File API start ${start.status}: ${(await start.text()).slice(0, 200)}`);
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("File API: no upload URL returned.");

  const up = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: bytes,
  });
  if (!up.ok) throw new Error(`File API upload ${up.status}: ${(await up.text()).slice(0, 200)}`);
  const info = await up.json();
  const name: string | undefined = info?.file?.name;
  let uri: string | undefined = info?.file?.uri;
  let state: string | undefined = info?.file?.state;
  if (!name || !uri) throw new Error("File API: missing file uri/name.");

  // Video must finish PROCESSING before it can be referenced.
  for (let i = 0; state !== "ACTIVE" && i < 30; i++) {
    if (state === "FAILED") throw new Error("File API: video processing failed.");
    await new Promise((r) => setTimeout(r, 2000));
    const st = await fetch(`${GEMINI_BASE}/${name}?key=${key}`);
    const sj = await st.json().catch(() => ({}));
    state = sj?.state ?? sj?.file?.state;
    uri = sj?.uri ?? sj?.file?.uri ?? uri;
  }
  if (state !== "ACTIVE") throw new Error("File API: video processing timed out.");
  return uri;
}

// ---- TikTok / Instagram resolver (Apify; actor auto-picked per platform) ----

async function resolveVideo(
  url: string,
  kind: "tiktok" | "instagram",
  warnings: string[],
): Promise<{ videoUrl?: string; caption?: string }> {
  const token = Deno.env.get("RESOLVER_API_KEY");
  if (!token) {
    warnings.push("Video resolver not configured (set RESOLVER_API_KEY).");
    return {};
  }
  const actor = Deno.env.get("RESOLVER_ACTOR") || RESOLVER_ACTORS[kind];
  // Each actor takes a different input shape. shouldDownloadVideos makes the TikTok actor
  // mirror the clip into its (private) key-value store and expose it via mediaUrls.
  const input = kind === "instagram"
    ? { directUrls: [url], resultsType: "posts", resultsLimit: 1 }
    : { postURLs: [url], resultsPerPage: 1, shouldDownloadVideos: true };
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    warnings.push(`Resolver error ${res.status}.`);
    return {};
  }
  const items = await res.json().catch(() => []);
  const it = Array.isArray(items) ? (items[0] ?? {}) : {};
  // IG: top-level videoUrl (Meta CDN). TikTok: mediaUrls[0] / videoMeta.downloadAddr point to
  // the Apify key-value store (when shouldDownloadVideos is on).
  let videoUrl: string | undefined = it.videoUrl ??
    (Array.isArray(it.mediaUrls) ? it.mediaUrls[0] : undefined) ??
    it.videoMeta?.downloadAddr ?? it.downloadUrl ?? it.mediaUrl ?? it.video?.url;
  // Apify KVS records are private — authenticate the fetch with the same token.
  if (videoUrl && videoUrl.includes("api.apify.com") && !/[?&]token=/.test(videoUrl)) {
    videoUrl += (videoUrl.includes("?") ? "&" : "?") + "token=" + token;
  }
  const caption = it.text ?? it.caption ?? it.description ?? it.title ?? "";
  return { videoUrl, caption };
}

// ---- Article scrape (Firecrawl preferred → handles JS + bot walls; falls back to fetch) ----

async function scrapeArticle(url: string, warnings: string[]): Promise<{ html: string; text: string }> {
  const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (fcKey) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${fcKey}` },
        body: JSON.stringify({ url, formats: ["rawHtml", "markdown"], onlyMainContent: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const d = data?.data ?? {};
        // rawHtml keeps the ld+json scripts (for JSON-LD); markdown is clean text for Gemini.
        return { html: String(d.rawHtml ?? d.html ?? ""), text: String(d.markdown ?? "") };
      }
      warnings.push(`Scraper error ${res.status}; trying a direct fetch.`);
    } catch {
      warnings.push("Scraper failed; trying a direct fetch.");
    }
  }
  const html = await fetchText(url); // fallback (may be blocked by big sites)
  return { html, text: readable(html) };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; ChefVaultImporter/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch ${res.status} for ${url}`);
  return await res.text();
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Media fetch ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function extractRecipeJsonLd(html: string): Record<string, unknown> | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const found = findRecipeNode(parsed);
    if (found) return found;
  }
  return null;
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipeNode(n);
      if (r) return r;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    const isRecipe = t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"));
    if (isRecipe) return obj;
    if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
  }
  return null;
}

function mapJsonLdRecipe(r: Record<string, unknown>): Record<string, unknown> {
  const ingredients = asArray(r.recipeIngredient).map((line) => ({ name: String(line) }));
  const steps = flattenInstructions(r.recipeInstructions);
  const image = Array.isArray(r.image)
    ? (typeof r.image[0] === "string" ? r.image[0] : (r.image[0] as Record<string, unknown>)?.url)
    : (typeof r.image === "string" ? r.image : (r.image as Record<string, unknown>)?.url);
  return {
    title: r.name ?? "",
    cuisine: typeof r.recipeCuisine === "string" ? r.recipeCuisine : asArray(r.recipeCuisine)[0],
    servings: parseInt(String(asArray(r.recipeYield)[0] ?? r.recipeYield ?? "1"), 10) || 1,
    prep_time: isoDurationToMinutes(r.prepTime),
    cook_time: isoDurationToMinutes(r.cookTime),
    description: typeof r.description === "string" ? r.description : null,
    image_url: image ?? null,
    ingredients,
    steps,
    warnings: ingredients.length === 0 ? ["No ingredients found in the page's recipe data."] : [],
  };
}

function flattenInstructions(instr: unknown): { instruction: string }[] {
  const out: { instruction: string }[] = [];
  const visit = (n: unknown) => {
    if (!n) return;
    if (typeof n === "string") out.push({ instruction: n });
    else if (Array.isArray(n)) n.forEach(visit);
    else if (typeof n === "object") {
      const o = n as Record<string, unknown>;
      if (o.itemListElement) visit(o.itemListElement);
      else if (typeof o.text === "string") out.push({ instruction: o.text });
    }
  };
  visit(instr);
  return out;
}

function isoDurationToMinutes(d: unknown): number | null {
  if (typeof d !== "string") return null;
  const m = d.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  const mins = (parseInt(m[1] ?? "0", 10) * 60) + parseInt(m[2] ?? "0", 10);
  return mins > 0 ? mins : null;
}

function readable(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(v: unknown): unknown[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

// Guard the shape before returning to the app (servings ≥ 1, numeric quantities, etc.).
function normalize(recipe: Record<string, unknown> | null): Record<string, unknown> {
  const r = recipe ?? {};
  const ingredients = asArray(r.ingredients).map((i) => {
    const o = i as Record<string, unknown>;
    return {
      name: String(o.name ?? "").trim(),
      quantity: typeof o.quantity === "number" ? o.quantity : Number(o.quantity) || 1,
      unit: String(o.unit ?? "").trim(),
      notes: o.notes ? String(o.notes) : null,
    };
  }).filter((i) => i.name.length > 0);
  const steps = asArray(r.steps).map((s) => {
    const o = s as Record<string, unknown>;
    return {
      instruction: String(o.instruction ?? "").trim(),
      timer_seconds: typeof o.timer_seconds === "number" ? o.timer_seconds : null,
    };
  }).filter((s) => s.instruction.length > 0);
  return {
    title: String(r.title ?? "Imported recipe"),
    cuisine: r.cuisine ? String(r.cuisine) : null,
    servings: Math.max(1, Number(r.servings) || 1),
    prep_time: r.prep_time != null ? Number(r.prep_time) : null,
    cook_time: r.cook_time != null ? Number(r.cook_time) : null,
    description: r.description ? String(r.description) : null,
    image_url: r.image_url ? String(r.image_url) : null,
    ingredients,
    steps,
  };
}
