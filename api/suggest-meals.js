// Vercel serverless function: suggest dinner ideas with Claude, based on the
// family's liked/disliked meals. ANTHROPIC_API_KEY stays server-side.

import { callClaude, parseJson } from "./_anthropic.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { liked = [], disliked = [], recent = [], count = 6 } = body || {};

  const prompt = `Suggest ${count} easy weeknight dinner ideas for a busy family with young kids.
Meals they love (lean toward this style): ${liked.length ? liked.join(", ") : "n/a"}.
Meals to avoid: ${disliked.length ? disliked.join(", ") : "none"}.
Recently made (do not repeat these): ${recent.length ? recent.join(", ") : "none"}.
Return ONLY minified JSON: {"suggestions":[{"name":"","time":"","note":""}]}. "time" like "30 min". "note" is a short reason, max 8 words.`;

  try {
    const raw = await callClaude(apiKey, prompt);
    const result = parseJson(raw);
    const suggestions = Array.isArray(result.suggestions)
      ? result.suggestions.slice(0, 12).map((s) => ({
          name: (s.name || "").toString(),
          time: (s.time || "").toString(),
          note: (s.note || "").toString(),
        })).filter((s) => s.name)
      : [];
    res.json({ suggestions });
  } catch (e) {
    console.error("Suggest error:", e);
    res.status(500).json({ error: e.message });
  }
}
