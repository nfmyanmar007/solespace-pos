const ALLOWED_EVENTS = new Set(["page_opened", "message_revealed"]);

function clean(value, max = 80) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(204).end();
  }

  const linkId = clean(req.body?.linkId || "apology-01");
  const eventType = clean(req.body?.eventType || "");

  if (!linkId || !ALLOWED_EVENTS.has(eventType)) {
    return res.status(400).json({ ok: false });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/apology_visits`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        link_id: linkId,
        event_type: eventType
      })
    });

    if (!response.ok) {
      return res.status(204).end();
    }

    return res.status(204).end();
  } catch (_) {
    return res.status(204).end();
  }
};
