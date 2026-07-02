// Vercel serverless function — writes a new event to the family Google Calendar
// using a service account. Credentials stay server-side (no VITE_ prefix).
//   GOOGLE_CLIENT_EMAIL   – the service account email
//   GOOGLE_PRIVATE_KEY    – the service account private key (with \n escapes)
//   GOOGLE_CALENDAR_ID    – the family calendar's ID (share it with the account)
import crypto from "crypto";

const TZ = "America/Denver";

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(privateKey)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${unsigned}.${signature}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(data.error_description || data.error || "Token request failed");
  return data.access_token;
}

// "18:00" + 60 min -> "19:00"
function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function nextDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!clientEmail || !rawKey || !calendarId) {
    return res.status(500).json({ error: "Google Calendar credentials not set" });
  }
  const privateKey = rawKey.replace(/\\n/g, "\n");

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { title, date, allDay, startTime, endTime, notes, who } = body || {};
  if (!title || !date) return res.status(400).json({ error: "Title and date are required" });

  // Attribute the event so the read side can color-code it by person
  const summary = who && who !== "family" ? `${who} - ${title}` : title;

  let start, end;
  if (allDay || !startTime) {
    start = { date };
    end = { date: nextDay(date) };
  } else {
    const st = startTime;
    const et = endTime && endTime > st ? endTime : addMinutes(st, 60);
    start = { dateTime: `${date}T${st}:00`, timeZone: TZ };
    end = { dateTime: `${date}T${et}:00`, timeZone: TZ };
  }

  try {
    const token = await getAccessToken(clientEmail, privateKey);
    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ summary, description: notes || "", start, end }),
      }
    );
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || "Calendar insert failed");
    res.json({ ok: true, id: data.id, htmlLink: data.htmlLink });
  } catch (e) {
    console.error("Create event error:", e);
    res.status(500).json({ error: e.message });
  }
}
