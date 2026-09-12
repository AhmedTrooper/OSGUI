/**
 * SyncLime Companion - Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  const statusPill = document.getElementById("status-pill");
  const statusText = document.getElementById("status-text");
  const tabFavicon = document.getElementById("tab-favicon");
  const tabTitle = document.getElementById("tab-title");
  const urlInput = document.getElementById("url-input");
  const pasteBtn = document.getElementById("paste-btn");
  const syncCookiesCheckbox = document.getElementById("sync-cookies");
  const autoCloseCheckbox = document.getElementById("auto-close");
  const sendBtn = document.getElementById("send-btn");
  const btnText = document.getElementById("btn-text");
  const defaultIcon = sendBtn.querySelector(".default-icon");
  const spinnerIcon = sendBtn.querySelector(".spinner-icon");
  const feedback = document.getElementById("feedback");
  const feedbackText = document.getElementById("feedback-text");

  let activeTabUrl = "";
  let activeTabTitle = "";
  let activePort = 14221;
  let isAppOnline = false;

  // 1. Query current active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      activeTabUrl = tab.url || "";
      activeTabTitle = tab.title || "Active Web Page";
      
      urlInput.value = activeTabUrl;
      tabTitle.textContent = activeTabTitle;
      tabTitle.title = activeTabTitle;
      
      if (tab.favIconUrl && !tab.favIconUrl.startsWith("chrome://")) {
        tabFavicon.src = tab.favIconUrl;
      }
    }
  } catch (err) {
    console.warn("Could not query active tab:", err);
  }

  // 2. Health check probe to SyncLime desktop daemon
  chrome.runtime.sendMessage({ action: "checkHealth" }, (response) => {
    if (response && response.online) {
      isAppOnline = true;
      activePort = response.port;
      statusPill.className = "status-pill online";
      statusText.textContent = `Online :${activePort}`;
    } else {
      isAppOnline = false;
      statusPill.className = "status-pill offline";
      statusText.textContent = "App Offline";
      showFeedback("SyncLime app is offline. Launch desktop app.", "warning");
    }
  });

  // Paste button handler
  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        urlInput.focus();
      }
    } catch (e) {
      console.warn("Clipboard paste permission error:", e);
    }
  });

  // Send button handler
  sendBtn.addEventListener("click", async () => {
    const targetUrl = urlInput.value.trim();
    if (!targetUrl) {
      showFeedback("Please enter a valid URL.", "error");
      return;
    }

    // Set UI to loading state
    setLoadingState(true);

    let netscapeCookies = "";
    if (syncCookiesCheckbox.checked) {
      try {
        const cookies = await chrome.cookies.getAll({ url: targetUrl });
        if (cookies && cookies.length > 0) {
          netscapeCookies = cookiesToNetscape(cookies);
        }
      } catch (err) {
        console.warn("Cookie extraction failed:", err);
      }
    }

    try {
      const response = await fetch(`http://127.0.0.1:${activePort}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          title: activeTabTitle || undefined,
          cookies: netscapeCookies || undefined,
        }),
      });

      const result = await response.json();
      setLoadingState(false);

      if (result.success) {
        if (result.already_exists) {
          showFeedback("Already in SyncLime Inbox", "warning");
        } else {
          showFeedback("Added to SyncLime Inbox!", "success");
        }

        if (autoCloseCheckbox.checked) {
          setTimeout(() => {
            window.close();
          }, 800);
        }
      } else {
        showFeedback(result.message || "Failed to enqueue URL.", "error");
      }
    } catch (err) {
      setLoadingState(false);
      showFeedback("Could not connect. Is SyncLime running?", "error");
      statusPill.className = "status-pill offline";
      statusText.textContent = "App Offline";
    }
  });

  function setLoadingState(loading) {
    sendBtn.disabled = loading;
    if (loading) {
      defaultIcon.classList.add("hidden");
      spinnerIcon.classList.remove("hidden");
      btnText.textContent = "Transmitting...";
    } else {
      defaultIcon.classList.remove("hidden");
      spinnerIcon.classList.add("hidden");
      btnText.textContent = "Send to SyncLime Inbox";
    }
  }

  function showFeedback(message, type = "info") {
    feedback.className = `feedback-banner ${type}`;
    feedbackText.textContent = message;
    feedback.classList.remove("hidden");
  }

  function cookiesToNetscape(cookies) {
    if (!cookies || !Array.isArray(cookies)) return "";
    const header = "# Netscape HTTP Cookie File\n\n";
    const lines = cookies.map((c) => {
      let domain = c.domain || "";
      const isDomain = domain.startsWith(".");
      const path = c.path || "/";
      const secure = c.secure ? "TRUE" : "FALSE";
      const expiry = Math.round(c.expirationDate || (Date.now() / 1000 + 86400 * 365));
      return `${domain}\t${isDomain ? "TRUE" : "FALSE"}\t${path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`;
    });
    return header + lines.join("\n") + "\n";
  }
});
