function clean(value, max = 80) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const statusSecret = process.env.STATUS_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !statusSecret) {
    return res.status(500).json({ ok: false, error: "Tracking is not configured." });
  }

  const suppliedSecret = req.headers["x-status-secret"];

  if (!suppliedSecret || suppliedSecret !== statusSecret) {
    return res.status(401).json({ ok: false, error: "Incorrect secret." });
  }

  const linkId = clean(req.query?.linkId || "apology-01");

  try {
    const params = new URLSearchParams({
      "select": "event_type,created_at",
      "link_id": `eq.${linkId}`,
      "order": "created_at.desc",
      "limit": "100"
    });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/apology_visits?${params.toString()}`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`
        }
      }
    );

    if (!response.ok) {
      return res.status(500).json({ ok: false, error: "Could not read status." });
    }

    const rows = await response.json();
    const pageOpened = rows.filter(r => r.event_type === "page_opened");
    const messageRevealed = rows.filter(r => r.event_type === "message_revealed");

    return res.status(200).json({
      ok: true,
      linkId,
      opened: pageOpened.length > 0,
      messageRevealed: messageRevealed.length > 0,
      openCount: pageOpened.length,
      revealCount: messageRevealed.length,
      lastOpenedAt: pageOpened[0]?.created_at || null,
      lastRevealedAt: messageRevealed[0]?.created_at || null
    });
  } catch (_) {
    return res.status(500).json({ ok: false, error: "Could not read status." });
  }
};
