/* =========================================================
   PERSONALIZE THIS SECTION
   ========================================================= */

const config = {
  herName: "Her Name",
  myName: "My Name",

  // Use a simple label unique to the link you send her.
  // It does NOT need to contain her real name.
  linkId: "apology-01",

  // Set false if you do not want any visit receipt at all.
  enableAnonymousVisitReceipt: true
};

/* =========================================================
   PAGE
   ========================================================= */

const introView = document.getElementById("introView");
const messageView = document.getElementById("messageView");
const readButton = document.getElementById("readButton");
const greeting = document.getElementById("greeting");
const signature = document.getElementById("signature");

function hasRealValue(value, placeholder) {
  return value && value.trim() && value.trim().toLowerCase() !== placeholder.toLowerCase();
}

if (hasRealValue(config.herName, "Her Name")) {
  greeting.textContent = `Hey ${config.herName.trim()}...`;
} else {
  greeting.textContent = "Hey...";
}

if (hasRealValue(config.myName, "My Name")) {
  signature.textContent = `— ${config.myName.trim()}`;
}

readButton.addEventListener("click", async () => {
  introView.hidden = true;
  introView.classList.remove("active");
  messageView.hidden = false;
  messageView.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (config.enableAnonymousVisitReceipt) {
    recordEvent("message_revealed");
  }
});

/* =========================================================
   TRANSPARENT, MINIMAL VISIT RECEIPT
   Stores only:
   - linkId
   - event type
   - server timestamp

   It does NOT intentionally send/store:
   - IP address
   - location
   - device/browser details
   - contacts
   - camera/microphone
   - form answers
   ========================================================= */

async function recordEvent(eventType) {
  try {
    await fetch("/api/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        linkId: String(config.linkId || "apology-01").slice(0, 80),
        eventType
      }),
      keepalive: true
    });
  } catch (_) {
    // The message page still works even if tracking is unavailable.
  }
}

if (config.enableAnonymousVisitReceipt) {
  recordEvent("page_opened");
}
