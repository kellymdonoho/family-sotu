// Vercel serverless function: extract a recipe from a URL or pasted text.
// Tries structured recipe data first (free, reliable), then falls back to Claude.
// ANTHROPIC_API_KEY stays server-side (no VITE_ prefix) so it never reaches the browser.

import { callClaude, parseJson } from "./_anthropic.js";

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Many recipe sites embed schema.org/Recipe as JSON-LD. Parse it directly when present.
function parseJsonLdRecipe(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const candidates = Array.isArray(data) ? data : (data["@graph"] ? data["@graph"] : [data]);
    for (const c of candidates) {
      const type = c && c["@type"];
      const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
      if (isRecipe && Array.isArray(c.recipeIngredient) && c.recipeIngredient.length) {
        return {
          name: (c.name || "").toString().trim(),
          time: "",
          ingredients: c.recipeIngredient.map((s) => s.toString().trim()).filter(Boolean),
        };
      }
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { url, text } = body || {};

  try {
    let content = "";
    if (url) {
      const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; family-sotu/1.0)" } });
      if (!resp.ok) throw new Error(`Could not fetch that page (${resp.status})`);
      const html = await resp.text();
      const jsonLd = parseJsonLdRecipe(html);
      if (jsonLd) return res.json(jsonLd);
      content = stripHtml(html);
    } else if (text) {
      content = text;
    } else {
      return res.status(400).json({ error: "Provide a url or text" });
    }

    const raw = await callClaude(
      apiKey,
      `Extract the recipe from the content below. Return ONLY minified JSON with this exact shape: {"name":"","time":"","ingredients":[]}. "time" is like "30 min" or "". "ingredients" are strings that include quantities. If the content is not a recipe, return {"name":"","time":"","ingredients":[]}.\n\nCONTENT:\n${content.slice(0, 12000)}`
    );
    const result = parseJson(raw);
    res.json({
      name: (result.name || "").toString(),
      time: (result.time || "").toString(),
      ingredients: Array.isArray(result.ingredients) ? result.ingredients.map(String) : [],
    });
  } catch (e) {
    console.error("Import error:", e);
    res.status(500).json({ error: e.message });
  }
}
