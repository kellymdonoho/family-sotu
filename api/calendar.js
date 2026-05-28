// Vercel serverless function — fetches family calendar iCal and returns JSON
// The ICAL_URL env var stays server-side (no VITE_ prefix) so it never reaches the browser

function parseIcal(text) {
  // Unfold line continuations (iCal wraps long lines)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const events = [];
  const blocks = unfolded.split("BEGIN:VEVENT");

  blocks.slice(1).forEach(block => {
    const endIdx = block.indexOf("END:VEVENT");
    if (endIdx === -1) return;
    const evt = block.slice(0, endIdx);

    const getField = (name) => {
      const lines = evt.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith(name + ":") || line.startsWith(name + ";")) {
          return line.split(":").slice(1).join(":").trim()
            .replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";");
        }
      }
      return "";
    };

    const summary     = getField("SUMMARY");
    const dtstartRaw  = getField("DTSTART");
    const status      = getField("STATUS");
    const uid         = getField("UID");
    const description = getField("DESCRIPTION");
    const location    = getField("LOCATION");

    if (status === "CANCELLED" || !summary || !dtstartRaw) return;

    // Parse the date/time value (may have TZID prefix before the colon)
    const clean = dtstartRaw.includes(":") ? dtstartRaw.split(":").pop() : dtstartRaw;
    const isAllDay = !clean.includes("T");

    let dateStr, timeStr;
    if (isAllDay) {
      dateStr = `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`;
      timeStr = "All day";
    } else {
      const yr = clean.slice(0,4), mo = clean.slice(4,6), dy = clean.slice(6,8);
      const hr = clean.slice(9,11), mn = clean.slice(11,13);
      const isUTC = clean.endsWith("Z");
      dateStr = `${yr}-${mo}-${dy}`;
      const d = isUTC
        ? new Date(`${yr}-${mo}-${dy}T${hr}:${mn}:00Z`)
        : new Date(`${yr}-${mo}-${dy}T${hr}:${mn}:00`);
      timeStr = d.toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Denver"
      });
    }

    // Detect who the event belongs to from title keywords
    const lower = summary.toLowerCase();
    let who = "family";
    if (lower.includes("kelly") && !lower.includes("kevin")) who = "Kelly";
    else if (lower.includes("kevin") && !lower.includes("kelly")) who = "Kevin";

    events.push({ id: uid || Math.random().toString(36).slice(2), title: summary, date: dateStr, time: timeStr, who, notes: description, location });
  });

  // Return only future/today events, sorted, max 75
  const todayStr = new Date().toISOString().split("T")[0];
  return events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 75);
}

export default async function handler(req, res) {
  const icalUrl = process.env.ICAL_URL;
  if (!icalUrl) {
    return res.status(500).json({ error: "ICAL_URL environment variable not set" });
  }
  try {
    const response = await fetch(icalUrl);
    if (!response.ok) throw new Error(`iCal fetch failed: ${response.status}`);
    const text = await response.text();
    const events = parseIcal(text);
    // Cache for 5 minutes so every page load doesn't hit Google
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    res.json({ events, fetched: new Date().toISOString() });
  } catch (e) {
    console.error("Calendar error:", e);
    res.status(500).json({ error: e.message });
  }
}
