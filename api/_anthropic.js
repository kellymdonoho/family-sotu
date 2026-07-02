// Shared Anthropic helper. Files prefixed with "_" are not exposed as routes.
// Auto-discovers an available model so we never hardcode one your key can't use.

let cachedModel = null;

export async function pickModel(apiKey) {
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;
  if (cachedModel) return cachedModel;
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    if (res.ok) {
      const data = await res.json();
      const ids = (data.data || []).map((m) => m.id);
      const haiku = ids.find((id) => id.includes("haiku"));
      const sonnet = ids.find((id) => id.includes("sonnet"));
      cachedModel = haiku || sonnet || ids[0] || "claude-3-haiku-20240307";
      return cachedModel;
    }
  } catch (e) {
    console.error("Model list error:", e);
  }
  cachedModel = "claude-3-haiku-20240307";
  return cachedModel;
}

export async function callClaude(apiKey, content, maxTokens = 1024) {
  const model = await pickModel(apiKey);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API ${res.status} (model ${model}): ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("").trim();
}

export function parseJson(text) {
  const s = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  return JSON.parse(s);
}
