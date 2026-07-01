// Vercel serverless function: suggest dinner ideas with Claude, based on the
// family's liked/disliked meals. ANTHROPIC_API_KEY stays server-side.

const MODEL = "claude-3-5-haiku-latest";

async function askClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("").trim();
  const jsonStr = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  return JSON.parse(jsonStr);
}

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
    const result = await askClaude(apiKey, prompt);
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
