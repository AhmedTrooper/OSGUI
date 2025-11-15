# 🎆 YT-DLP GUI - Tauri v2 + React + Zustand + HeroUI

A lightweight desktop GUI for `yt-dlp`, built using [Tauri v2](https://tauri.app/), [React TypeScript](https://react.dev/), [Zustand](https://github.com/pmndrs/zustand), and [HeroUI](https://www.heroui.com/).

## ⚙️ Features

- Clean and minimal UI for downloading videos via `yt-dlp`
- Playlist and individual video download support
- Format selection and audio/video filters
- Integrated logging and real-time download progress
- Cross-platform (Windows, macOS, Linux)

## 🖼️ Screenshots

| Form                                                                                            | Playlist                                                                                              | Dropdown                                                                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ![Form](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/form001.png) | ![Playlist](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pllist003.png) | ![Dropdown](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/slpdown.png) |

| Pause Button                                                                                   | Selected Playlist                                                                                                     | DFD01                                                                                          |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| ![Pause](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pause.png) | ![Selected Playlist](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/selectedplaylist.png) | ![DFD01](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/dfd01.png) |

| DFD002                                                                                           |
| ------------------------------------------------------------------------------------------------ |
| ![DFD002](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/dfd002.png) |

> You can check all UI assets in [`resources_github`](https://github.com/AhmedTrooper/OSGUI/tree/main/resources_github).

## 🧩 Requirements

Please ensure the following tools are installed and accessible from your system `PATH`:

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (must be named exactly `yt-dlp.exe` on Windows so running `yt-dlp --version` shows version info — `ytdlp`, `ytdlpx64`, etc. are **not** supported!)
- [ffmpeg](https://ffmpeg.org/) (mandatory)
- [ffplay](https://ffmpeg.org/)
- [ffprobe](https://ffmpeg.org/)

> 🔄 **Important:** `yt-dlp` gets new releases about every 2 weeks. Keep it **up to date** for best site compatibility.  
> 💡 You can install or update `yt-dlp` using:
>
> - **PIP:** `python -m pip install -U yt-dlp`
> - **Standalone Binary:** Download the latest build from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
>
> `ffmpeg` is also required for merging, transcoding, and audio extraction.

You can verify installation by running:

```bash
yt-dlp --version
ffmpeg
ffplay
ffprobe
```
