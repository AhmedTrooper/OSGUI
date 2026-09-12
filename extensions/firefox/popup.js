/**
 * SyncLime Companion - Popup Controller
 *
 * Manifest V3 Least-Privilege Architecture:
 * - Default port 14221 with automatic OS clash range probing (14221–14230).
 * - Optional "cookies" permission with user-facing Sensitive Data Notice modal.
 * - Explicit user opt-in & site-by-site consent retention.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Navigation & Settings Elements
  const statusPill = document.getElementById("status-pill");
  const statusText = document.getElementById("status-text");
  const toggleSettingsBtn = document.getElementById("toggle-settings-btn");
  const portDrawer = document.getElementById("port-drawer");
  const closeDrawerBtn = document.getElementById("close-drawer-btn");
  const modeAutoBtn = document.getElementById("mode-auto-btn");
  const modeCustomBtn = document.getElementById("mode-custom-btn");
  const customPortRow = document.getElementById("custom-port-row");
  const customPortInput = document.getElementById("custom-port-input");
  const savePortBtn = document.getElementById("save-port-btn");
  const scanPortsBtn = document.getElementById("scan-ports-btn");
  const portProbeResult = document.getElementById("port-probe-result");
  const activePortIndicator = document.getElementById("active-port-indicator");

  // Privacy & Permission Drawer Elements
  const cookiePermBadge = document.getElementById("cookie-perm-badge");
  const revokePermsBtn = document.getElementById("revoke-perms-btn");

  // Main Card Elements
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

  // Sensitive Data Consent Modal Elements
  const sensitiveModal = document.getElementById("sensitive-modal");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalDomain = document.getElementById("modal-domain");
  const modalPortText = document.getElementById("modal-port-text");
  const rememberConsentCheckbox = document.getElementById("remember-consent");
  const allowCookieBtn = document.getElementById("allow-cookie-btn");
  const denyCookieBtn = document.getElementById("deny-cookie-btn");

  let activeTabUrl = "";
  let activeTabTitle = "";
  let currentPort = 14221;
  let currentMode = "auto";
  let isAppOnline = false;

  function extractDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname || "";
    } catch {
      return "";
    }
  }

  // 1. Query active tab information
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

  // 2. Load stored port preferences & permission states
  try {
    const stored = await chrome.storage.local.get(["port_mode", "custom_port", "consented_domains"]);
    currentMode = stored.port_mode || "auto";
    if (stored.custom_port) {
      customPortInput.value = stored.custom_port;
    }
    updateModeUI(currentMode);

    // Check if user previously authorized cookies for this active domain
    const domain = extractDomain(activeTabUrl);
    const consented = stored.consented_domains || [];
    const hasPerm = await checkCookiePermission();

    if (hasPerm && domain && consented.includes(domain)) {
      syncCookiesCheckbox.checked = true;
    }
  } catch (err) {
    console.warn("Error loading stored preferences:", err);
  }

  // 3. Probing health check to desktop daemon
  function refreshHealth() {
    chrome.runtime.sendMessage({ action: "checkHealth" }, (response) => {
      if (response && response.online) {
        isAppOnline = true;
        currentPort = response.port;

        if (response.isClashed) {
          statusPill.className = "status-pill clashed";
          statusText.textContent = `Shifted :${currentPort}`;
          activePortIndicator.textContent = `Auto-Shifted: ${currentPort}`;
          activePortIndicator.title =
            "Port 14221 was occupied by the OS; automatically shifted to an open port in the 14221–14230 range.";
        } else {
          statusPill.className = "status-pill online";
          statusText.textContent = `Online :${currentPort}`;
          activePortIndicator.textContent = `Port: ${currentPort}`;
        }
      } else {
        isAppOnline = false;
        currentPort = response ? response.port : 14221;
        statusPill.className = "status-pill offline";
        statusText.textContent = "Offline";
        activePortIndicator.textContent = `Port: ${currentPort} (Unreachable)`;
        showFeedback("SyncLime app is offline. Launch desktop app.", "warning");
      }
      refreshPermissionBadge();
    });
  }

  refreshHealth();

  // Check whether optional "cookies" permission is granted
  async function checkCookiePermission() {
    try {
      if (chrome.permissions && chrome.permissions.contains) {
        return await chrome.permissions.contains({ permissions: ["cookies"] });
      }
    } catch {
      // Fallback
    }
    return false;
  }

  // Update permission status badge in Settings Drawer
  async function refreshPermissionBadge() {
    if (!cookiePermBadge) return;
    const hasCookies = await checkCookiePermission();
    if (hasCookies) {
      cookiePermBadge.className = "perm-badge granted";
      cookiePermBadge.textContent = "Authorized";
    } else {
      cookiePermBadge.className = "perm-badge opt-in";
      cookiePermBadge.textContent = "Opt-in (Safe)";
    }
  }

  // Settings Drawer Toggle
  function toggleDrawer(open) {
    if (open !== undefined) {
      portDrawer.classList.toggle("hidden", !open);
    } else {
      portDrawer.classList.toggle("hidden");
    }
    if (!portDrawer.classList.contains("hidden")) {
      refreshPermissionBadge();
    }
  }

  toggleSettingsBtn.addEventListener("click", () => toggleDrawer());
  statusPill.addEventListener("click", () => toggleDrawer());
  closeDrawerBtn.addEventListener("click", () => toggleDrawer(false));

  function updateModeUI(mode) {
    currentMode = mode;
    if (mode === "custom") {
      modeCustomBtn.classList.add("active");
      modeAutoBtn.classList.remove("active");
      customPortRow.classList.remove("hidden");
    } else {
      modeAutoBtn.classList.add("active");
      modeCustomBtn.classList.remove("active");
      customPortRow.classList.add("hidden");
    }
  }

  modeAutoBtn.addEventListener("click", () => updateModeUI("auto"));
  modeCustomBtn.addEventListener("click", () => updateModeUI("custom"));

  // Save Port Settings
  savePortBtn.addEventListener("click", () => {
    const customPort = customPortInput.value ? parseInt(customPortInput.value, 10) : null;
    if (currentMode === "custom" && (!customPort || customPort < 1024 || customPort > 65535)) {
      alert("Please enter a valid port between 1024 and 65535.");
      return;
    }

    chrome.runtime.sendMessage(
      { action: "savePortSettings", mode: currentMode, customPort },
      (portInfo) => {
        refreshHealth();
        toggleDrawer(false);
        showFeedback(`Port settings updated: using port ${portInfo.port}`, "info");
      },
    );
  });

  // Probe / Scan Port Range
  scanPortsBtn.addEventListener("click", () => {
    portProbeResult.classList.remove("hidden");
    portProbeResult.innerHTML = "Scanning ports 14221–14230...";

    chrome.runtime.sendMessage({ action: "scanPortRange" }, (response) => {
      if (!response || !response.results) {
        portProbeResult.innerHTML = "Scan failed.";
        return;
      }

      const lines = response.results.map((r) => {
        const mark = r.online ? "🟢 OPEN (v" + (r.version || "0.1.1") + ")" : "⚪ offline";
        return `Port ${r.port}: ${mark}`;
      });

      portProbeResult.innerHTML = lines.join("<br>");
    });
  });

  // Reset Permissions & Authorizations
  revokePermsBtn.addEventListener("click", async () => {
    try {
      await chrome.storage.local.remove(["consented_domains"]);
      try {
        if (chrome.permissions && chrome.permissions.remove) {
          await chrome.permissions.remove({ permissions: ["cookies"] });
        }
      } catch (err) {
        console.debug("Optional permission removal notice:", err);
      }
      syncCookiesCheckbox.checked = false;
      await refreshPermissionBadge();
      showFeedback("Cookie authorizations reset to default opt-in.", "info");
    } catch (err) {
      console.warn("Failed resetting authorizations:", err);
    }
  });

  // Sensitive Data Consent Modal Controls
  function showSensitiveModal(targetUrl) {
    const domain = extractDomain(targetUrl) || "current website";
    modalDomain.textContent = domain;
    modalPortText.textContent = `127.0.0.1:${currentPort}`;
    sensitiveModal.classList.remove("hidden");
  }

  function hideSensitiveModal() {
    sensitiveModal.classList.add("hidden");
  }

  modalCloseBtn.addEventListener("click", () => {
    syncCookiesCheckbox.checked = false;
    hideSensitiveModal();
  });

  denyCookieBtn.addEventListener("click", () => {
    syncCookiesCheckbox.checked = false;
    hideSensitiveModal();
    showFeedback("Cookie sync disabled. Sending clean URL only.", "info");
  });

  // Authorize & Request Optional Cookie Permission
  allowCookieBtn.addEventListener("click", async () => {
    const targetUrl = urlInput.value.trim() || activeTabUrl;
    const domain = extractDomain(targetUrl);
    let originPattern = "*://*/*";

    try {
      const u = new URL(targetUrl);
      originPattern = `${u.protocol}//${u.hostname}/*`;
    } catch {
      // Keep wildcard fallback
    }

    try {
      // Manifest V3 standard: Request optional permissions inside user gesture
      const granted = await chrome.permissions.request({
        permissions: ["cookies"],
        origins: [originPattern],
      });

      if (granted) {
        syncCookiesCheckbox.checked = true;
        if (rememberConsentCheckbox.checked && domain) {
          const stored = await chrome.storage.local.get(["consented_domains"]);
          const consentedList = stored.consented_domains || [];
          if (!consentedList.includes(domain)) {
            consentedList.push(domain);
            await chrome.storage.local.set({ consented_domains: consentedList });
          }
        }
        await refreshPermissionBadge();
        hideSensitiveModal();
        showFeedback(`Session cookies authorized for ${domain}`, "info");
      } else {
        syncCookiesCheckbox.checked = false;
        hideSensitiveModal();
        showFeedback("Cookie authorization declined. Sending URL only.", "warning");
      }
    } catch (err) {
      console.warn("Permission request error:", err);
      // Even if origins failed pattern parsing, attempt cookies permission directly
      try {
        const fallbackGranted = await chrome.permissions.request({
          permissions: ["cookies"],
        });
        if (fallbackGranted) {
          syncCookiesCheckbox.checked = true;
          await refreshPermissionBadge();
          hideSensitiveModal();
          showFeedback("Session cookies authorized.", "info");
          return;
        }
      } catch {
        // Ignored
      }
      syncCookiesCheckbox.checked = false;
      hideSensitiveModal();
      showFeedback("Could not request cookie authorization.", "error");
    }
  });

  // Checkbox toggle listener
  syncCookiesCheckbox.addEventListener("change", async () => {
    if (syncCookiesCheckbox.checked) {
      const targetUrl = urlInput.value.trim() || activeTabUrl;
      const domain = extractDomain(targetUrl);

      const hasPerm = await checkCookiePermission();
      const stored = await chrome.storage.local.get(["consented_domains"]);
      const consented = stored.consented_domains || [];

      if (hasPerm && domain && consented.includes(domain)) {
        return; // Already consented and authorized
      }

      // Revert until explicit modal consent
      syncCookiesCheckbox.checked = false;
      showSensitiveModal(targetUrl);
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
      console.warn("Clipboard read error:", e);
    }
  });

  // Send button handler
  sendBtn.addEventListener("click", async () => {
    const targetUrl = urlInput.value.trim();
    if (!targetUrl) {
      showFeedback("Please enter a valid URL.", "error");
      return;
    }

    // If user wants cookie sync but hasn't authorized yet, prompt modal
    if (syncCookiesCheckbox.checked) {
      const hasPerm = await checkCookiePermission();
      if (!hasPerm) {
        showSensitiveModal(targetUrl);
        return;
      }
    }

    setLoadingState(true);

    let netscapeCookies = "";
    if (syncCookiesCheckbox.checked) {
      try {
        if (chrome.cookies) {
          const cookies = await chrome.cookies.getAll({ url: targetUrl });
          if (cookies && cookies.length > 0) {
            netscapeCookies = cookiesToNetscape(cookies);
          }
        }
      } catch (err) {
        console.warn("Cookie extraction failed:", err);
      }
    }

    try {
      const response = await fetch(`http://127.0.0.1:${currentPort}/add`, {
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
      showFeedback(`Cannot connect on port ${currentPort}. Launch SyncLime.`, "error");
      statusPill.className = "status-pill offline";
      statusText.textContent = "Offline";
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
      const expiry = Math.round(c.expirationDate || Date.now() / 1000 + 86400 * 365);
      return `${domain}\t${isDomain ? "TRUE" : "FALSE"}\t${path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`;
    });
    return header + lines.join("\n") + "\n";
  }
});
