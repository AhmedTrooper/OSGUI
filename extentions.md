# 🧩 SyncLime Browser Companion Extensions

The **SyncLime Browser Companion** extension allows you to send video links, playlist URLs, and session cookies directly from your web browser into the SyncLime desktop application with a single click.

---

## ⚡ Architecture & How It Works

```
Browser Tab (Chrome / Firefox)
      │
      ▼  User clicks "Send to SyncLime" or presses Alt + S
SyncLime Companion Extension
      │
      ▼  Extracts active URL & Netscape session cookies
Local Daemon (http://127.0.0.1:14221)
      │
      ▼  Inserts into SQLite DB & updates Cookie Profiles
SyncLime Desktop Application (SolidJS + Rust)
      │
      ▼  Triggers reactive 'inbox-updated' event
Ready in Inbox & Queue for Download
```

- **Zero Remote Servers:** All communication happens purely on your local machine (`127.0.0.1`).
- **Dynamic Port Probing:** SyncLime uses port `14221` by default, but if another app occupies the port, the extension automatically probes ports `14221`–`14230`.
- **Session Cookie Transfer:** Extracts Netscape-formatted cookies for the active domain so `yt-dlp` can ingest age-restricted, subscriber-only, or private videos seamlessly.

---

## 🚀 Installation Guide

The source code for both extensions is included directly in the repository under [`extensions/`](./extensions/).

### 1. Google Chrome / Brave / Microsoft Edge / Vivaldi

1. Open your browser and navigate to:
   - **Chrome:** `chrome://extensions`
   - **Brave:** `brave://extensions`
   - **Edge:** `edge://extensions`
2. Enable **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the directory:
   ```
   /path/to/Synclime/extensions/chrome
   ```
5. Pin the **SyncLime** extension icon to your browser toolbar.

---

### 2. Mozilla Firefox / LibreWolf / Floorp

1. Open Firefox and navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```
2. Click **Load Temporary Add-on...**.
3. Select the file:
   ```
   /path/to/Synclime/extensions/firefox/manifest.json
   ```
4. The extension will activate immediately and remain ready for local syncing.

---

## 🎯 Usage & Key Features

### 1. The Popup Interface

Click the SyncLime icon in your toolbar:

- **Status Indicator:** Shows green `Online :14221` when SyncLime is running, amber `Shifted :14222` if port 14221 was occupied by the OS, or red `Offline` if not launched yet.
- **Connection Port Drawer:** Toggle between automatic probing (`14221–14230`) and manual custom port override.
- **Active URL Field:** Automatically pre-filled with the current page URL (editable, with clipboard paste button).
- **Session Cookies Authorization (Sensitive Permission):** Opt-in by default. Synchronizing cookies requires explicit authorization via the **Sensitive Data Disclosure Modal**. Transmits Netscape cookies strictly to your local desktop daemon (`127.0.0.1`) so `yt-dlp` can ingest age-restricted, subscriber-only, or private media.
- **Privacy & Permissions:** Easily reset or revoke cookie authorizations at any time directly in the Settings Drawer.
- **Auto-Close:** Automatically dismisses the popup upon successful delivery to the desktop inbox.

### 2. Manifest V3 Security & Privacy Compliance

To guarantee acceptance by Chrome Web Store and Mozilla Add-ons (AMO) review teams:

- **Least-Privilege Baseline:** Extension installs with minimal required permissions (`activeTab`, `storage`, `notifications`, `contextMenus`) and loopback host permissions (`http://127.0.0.1/*`, `http://localhost/*`). It never demands broad `*://*/*` host permissions at install time.
- **Sensitive Data Disclosure Modal:** When cookie sync is requested, a dedicated dialog explains what data is shared, why (local `yt-dlp` extraction), and confirms that credentials never leave your machine.
- **Browser-Native Permission Prompts:** Optional permissions are requested in response to explicit user gestures in compliance with MV3 guidelines.

### 3. Context Menu (Right-Click)

- Right-click any link, video player, or blank area of a page.
- Select **"Send to SyncLime Inbox"**.
- A desktop notification confirms the link has been queued.

### 4. Keyboard Shortcut

- Press <kbd>Alt</kbd> + <kbd>S</kbd> on any tab to instantly enqueue the current page to SyncLime without opening the popup.

---

## 🔧 Troubleshooting

| Symptom                     | Cause                                     | Solution                                                            |
| :-------------------------- | :---------------------------------------- | :------------------------------------------------------------------ |
| **"App Offline" indicator** | SyncLime desktop application is not open. | Launch the SyncLime desktop application.                            |
| **"Could not connect"**     | Local firewall blocking loopback port.    | Allow incoming localhost connections on ports `14221`–`14230`.      |
| **Cookies not applying**    | Authorization declined or incognito.      | Re-authorize in popup modal, or allow in incognito settings.        |
