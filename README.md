# 🎆 YT-DLP GUI - Tauri v2 + React + Zustand + HeroUI

A lightweight desktop GUI for `yt-dlp`, built using [Tauri v2](https://tauri.app/), [React TypeScript](https://react.dev/), [Zustand](https://github.com/pmndrs/zustand), and [HeroUI](https://www.heroui.com/).

![Complete Workflow](resources_github/OSGUI_latest.png)

## 🧠 Engineering Spotlight: The "Zombie Process" Solution
<a id="technical-deep-dive"></a>

**Problem:** Implementing a reliable "Pause/Resume" feature for `yt-dlp` is notoriously difficult because standard OS-level `kill(pid)` signals often fail to terminate child workers (like `ffmpeg`), leading to "zombie processes" that continue downloading in the background and cause memory leaks.

**My Solution (Stream Interception Architecture):**
Instead of relying on unstable OS Process IDs, I architected a **stream-based kill switch**:
1.  **Inversion of Control:** I implemented a "Kill Queue" state in Zustand (`idsToPause`).
2.  **Stream Injection:** The download logic injects a check inside the active `stdout` data event loop.
3.  **Self-Termination:** When a chunk is received, the process checks the queue. If its ID is present, it terminates itself from *within* its own closure.

**Result:** 100% reliable pausing with zero memory leaks, independent of the operating system.
> *[View the Source Code for this Logic](src/stores/download/actions.slice.ts)*

---

## ⚙️ Features

- **Robust Process Management:** Custom supervisor prevents zombie processes during pause/resume cycles.
- **Normalized State Architecture:** Uses Map + ID List pattern to prevent UI re-renders during high-frequency I/O updates (100+ chunks/sec).
- Clean and minimal UI for downloading videos via `yt-dlp`.
- Playlist and individual video download support.
- Format selection and audio/video filters.
- Integrated logging and real-time download progress.
- Cross-platform (Windows, macOS, Linux).

## 🖼️ Screenshots

| Form | Playlist | Dropdown |
| :--- | :--- | :--- |
| ![Form](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/form001.png) | ![Playlist](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pllist003.png) | ![Dropdown](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/slpdown.png) |

| Pause Button | Selected Playlist | DFD01 |
| :--- | :--- | :--- |
| ![Pause](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pause.png) | ![Selected Playlist](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/selectedplaylist.png) | ![DFD01](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/dfd01.png) |

| DFD002 |
| :--- |
| ![DFD002](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/dfd002.png) |

> You can check all UI assets in [`resources_github`](https://github.com/AhmedTrooper/OSGUI/tree/main/resources_github).

## 🧩 Requirements

Please ensure the following tools are installed and accessible from your system `PATH`:

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (must be named exactly `yt-dlp.exe` on Windows)
- [ffmpeg](https://ffmpeg.org/) (mandatory)
- [ffplay](https://ffmpeg.org/)
- [ffprobe](https://ffmpeg.org/)

> 🔄 **Important:** `yt-dlp` gets new releases about every 2 weeks. Keep it **up to date**.

You can verify installation by running:
```bash
yt-dlp --version
ffmpeg
ffplay
ffprobe
