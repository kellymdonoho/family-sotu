// Vercel serverless function: turn the grocery list into an Instacart shopping
// list page and return a shareable link. INSTACART_API_KEY stays server-side.
// Base URL: prod is https://connect.instacart.com; for a dev key set
// INSTACART_BASE=https://connect.dev.instacart.tools

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "INSTACART_API_KEY not set" });
  const base = process.env.INSTACART_BASE || "https://connect.instacart.com";

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { items = [], title = "Family SotU groceries" } = body || {};

  // Instacart matches on product name; strip our quantity suffix ("Lettuce, 1 head" -> "Lettuce")
  const line_items = items
    .map((s) => (s || "").split(" - add ingredients manually")[0].split(",")[0].trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  if (!line_items.length) return res.status(400).json({ error: "No items to send" });

  try {
    const r = await fetch(`${base}/idp/v1/products/products_link`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ title, link_type: "shopping_list", line_items }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || data.error || `Instacart API ${r.status}`);
    res.json({ url: data.products_link_url });
  } catch (e) {
    console.error("Instacart error:", e);
    res.status(500).json({ error: e.message });
  }
}
