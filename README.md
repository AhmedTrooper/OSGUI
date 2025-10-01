# OSGUI - yt-dlp Desktop Interface

A desktop GUI application for yt-dlp built with Tauri v2, React, and TypeScript. This project combines web technologies with native system integration to provide a user-friendly interface for video downloading and playlist management.

**Technology Stack:** Tauri v2 • React 18 • TypeScript 5.6 • Zustand • HeroUI • SQLite • Tailwind CSS

## Implementation Overview

### Main Application Architecture

The application is structured around a central video processing system with modular component organization. The main entry point is `VideoContainer.tsx` which orchestrates different UI sections based on user actions.

### 1. URL Input and Processing System

The core interface starts with `UserInputSection.tsx`, which handles video/playlist URL input with a visual toggle:

```typescript
// UserInputSection.tsx - Main input interface
<Switch
  isSelected={downloadPlaylist}
  onChangeCapture={() => setDownloadPlaylist(!downloadPlaylist)}
>
  <List className={clsx("", {
    "text-green-600": downloadPlaylist,    // Green when playlist mode
    "text-red-600": !downloadPlaylist,    // Red when video mode
  })} />
</Switch>
```

The URL validation ensures proper HTTP/HTTPS format and the system supports clipboard paste functionality for URLs.

### 2. yt-dlp Command Strategy

The `UserInputVideoStore.ts` implements dual command patterns based on the playlist toggle:

```typescript
// UserInputVideoStore.ts - Command selection logic
const videoCommand = Command.create("ytDlp", [
  "--dump-json",
  videoUrl.trim()
]);

const playlistCommand = Command.create("ytDlp", [
  "--flat-playlist",
  "--dump-single-json",
  "--yes-playlist", 
  "--no-warnings",
  "--ignore-errors",
  videoUrl.trim()
]);

if (downloadPlaylist) {
  command = playlistCommand;
} else {
  command = videoCommand;
}
```

### 3. Download Management with Database Integration

Downloads are tracked using SQLite through the `DatabaseStore.ts`. The database schema handles comprehensive download state:

```sql
CREATE TABLE IF NOT EXISTS DownloadList (
  id VARCHAR(255) PRIMARY KEY,
  unique_id VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  failed BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  isPaused BOOLEAN NOT NULL DEFAULT false,
  format_id VARCHAR(255) NOT NULL,
  web_url VARCHAR(255),
  title VARCHAR(255),
  tracking_message TEXT,
  playlistVerification TEXT,
  playlistTitle TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The `DownloadStore.ts` handles the actual download execution with real-time progress updates:

```typescript
// DownloadStore.ts - Download execution with progress tracking
downloadHandler: async (formatString, videoUrl, videoTitle, directURL = false) => {
  const uniqueId = nanoid(20);
  const db = await Database.load("sqlite:osgui.db");
  
  let coreDownloadCommand = Command.create("ytDlp", [
    "-f", formatString,
    "-o", `${downloadDirectory}/OSGUI/%(title)s${formatString}.%(ext)s`,
    videoUrl
  ]);

  // Real-time progress tracking via stdout
  coreDownloadCommand.stdout.on("data", async (data) => {
    await db.execute(
      "UPDATE DownloadList SET tracking_message = $1 WHERE unique_id = $2",
      [data.toString().trim(), uniqueId]
    );
  });
}
```

### 4. Playlist Processing Implementation

Playlist functionality is handled by `HeavyPlaylistStore.ts` with predefined quality options:

```typescript
// QualityEnumsInterface.ts - Available quality presets
export enum LightPlaylistVideoQuality {
  BEST = "bestvideo+bestaudio",
  MAX4K = "bestvideo[height<=2160]+bestaudio", 
  MAX2K = "bestvideo[height<=1440]+bestaudio",
  MAX1080P = "bestvideo[height<=1080]+bestaudio",
  MAX720P = "bestvideo[height<=720]+bestaudio",
  AUDIOONLY = "bestaudio"
}
```

Playlist downloads are organized into separate folders:

```typescript
// HeavyPlaylistStore.ts - Individual playlist item download
lightPlaylistSingleDownloadHandler: async (fileTitle, fileUrl, playlistTitle, fileFormat) => {
  const coreDownloadCommand = Command.create("ytDlp", [
    "-f", fileFormat,
    "-o", `${downloadDirectory}/OSGUI/${playlistTitle}/%(title)s${formatString}.%(ext)s`,
    fileUrl
  ]);
}
```

### 5. Direct File Download Feature

The application extends beyond video content with `DirectDownloadSection.tsx`. This component handles any file type using a "DFU" (Direct File Universal) identifier:

```typescript
// DirectDownloadSection.tsx - Universal file download
<Button
  onPress={() => downloadHandler("DFU", fileUrl, fileTitle, true)}
>
  Download File
</Button>
```

File management utilities in `FileStore.ts` include clipboard integration:

```typescript
// FileStore.ts - Clipboard and title utilities  
pasteFileUrl: async () => {
  const clipText = await readText();
  get().setFileUrl(clipText);
},

generateFileTitle: async () => {
  const generatedFileTitle = nanoid(15);
  FileStore.setFileTitle(generatedFileTitle);
}
```

## State Management System

The application uses Zustand for state management, organized into 8 specialized stores that handle different aspects of functionality:

### Store Organization

**Primary Video/Playlist Stores:**
- `UserInputVideoStore` - URL input, video metadata, and clipboard operations
- `HeavyPlaylistStore` - Playlist processing, selection, and batch downloads
- `DownloadStore` - Download queue management and format selection

**System Management Stores:**
- `DatabaseStore` - SQLite operations and optional analytics
- `ApplicationStore` - Version checking and update notifications
- `ThemeStore` - Dark/light mode with localStorage persistence
- `FileStore` - Direct file download state management
- `UtilityStore` - Helper functions and data parsing

### Store Implementation Examples

The theme system demonstrates simple state persistence:

```typescript
// ThemeStore.ts - Theme persistence implementation
const useThemeStore = create<ThemeState>((set, get) => ({
  dark: true,
  savedTheme: localStorage.getItem("theme"),
  
  setThemeData: () => {
    const themeStore = get();
    if (themeStore.savedTheme === "dark") {
      themeStore.setDark(true);
      localStorage.setItem("theme", "dark");
    } else {
      themeStore.setDark(false);
      localStorage.setItem("theme", "light");
    }
  }
}));
```

The download store handles complex asynchronous operations:

```typescript
// DownloadStore.ts - Format selection logic
videoStreamSelect: (vst: string) => {
  const { selectedAudioStream, setSelectedFormat, setSelectedVideoStream } = get();
  setSelectedVideoStream(vst);
  
  if (selectedAudioStream) {
    let formatString = `${vst.trim()}+${selectedAudioStream.trim()}`;
    setSelectedFormat(formatString);
  } else {
    setSelectedFormat(vst.trim());
  }
}
```

## 🏗️ Technical Architecture

### **State Management with Zustand Stores**
```typescript
## User Interface Components

### Window Management System

The application implements custom window controls through `MenuBar.tsx`. This component handles window operations and ensures proper cleanup:

```typescript
// MenuBar.tsx - Window close with download state preservation
const handleWindowClose = async () => {
  try {
    const db = await Database.load("sqlite:osgui.db");
    // Pause all active downloads before closing
    await db.execute("UPDATE DownloadList SET active = false, isPaused = true");
    await getCurrentWindow().close();
  } catch (e) {
    console.log(e);
  }
};
```

### Download Progress Display

The `DownloadSection.tsx` component provides real-time download monitoring with interactive controls:

```typescript
// DownloadSection.tsx - Progress display with controls
{downloadsArr.map((download) => (
  <div key={download.unique_id}>
    {/* Pause button for active downloads */}
    <Button onClick={() => setVideoToPause(download.unique_id)}>
      <FaPause />
    </Button>
    
    {/* Real-time progress message */}
    <span>{download.tracking_message}</span>
    
    {/* Remove from queue */}
    <Trash2Icon onClick={() => singleFileRemove(download.unique_id)} />
    
    {/* Retry download */}
    <CirclePower onClick={() => downloadHandler(
      download.format_id, 
      download.web_url, 
      download.title
    )} />
  </div>
))}
```

### Playlist Interface Components

Playlist functionality is split across multiple components for better organization:

**CompletePlaylistDownloadComponent.tsx** - Batch operations:
```typescript
// Batch download with quality selection
<Button onPress={() => lightPlaylistBatchDownload(
  lightEntriesArr,
  heavyPlaylistInformation?.title,
  LightPlaylistVideoQuality.BEST
)}>
  Complete Playlist (Best Quality)
</Button>
```

**SelectedPlaylistDownloadComponent.tsx** - Selective downloads:
```typescript
// Download only selected playlist items
<Button onPress={() => lightPlaylistBatchDownload(
  modifiedLightEntriesArr,  // User-selected items only
  heavyPlaylistInformation?.title,
  LightPlaylistVideoQuality.MAX1080P
)}>
  Selected Playlist (Max-1080p)
</Button>
```

### Application Lifecycle Management

The `ApplicationStore.ts` handles version checking and maintenance:

```typescript
// ApplicationStore.ts - Version comparison logic
fetchAppVersion: async () => {
  let response = await fetch(
    "https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/update/metadata.json"
  );
  
  if (localApplicationVersion < onlineApplicationVersion) {
    addToast({
      title: "Application Update Available",
      color: "warning"
    });
  }
}
```

## Project Structure

The codebase is organized into logical modules for maintainability:

```
src/
├── components/           # React UI components
│   ├── video/           # Video-specific components
│   │   ├── UserInputSection.tsx      # URL input with playlist toggle
│   │   ├── DownloadSection.tsx       # Download queue display
│   │   ├── FormatSection.tsx         # Quality selection interface
│   │   └── VideoContainer.tsx        # Main orchestration component
│   ├── playlist/        # Playlist management
│   │   ├── CompletePlaylistDownloadComponent.tsx  # Batch downloads
│   │   ├── SelectedPlaylistDownloadComponent.tsx  # Selective downloads
│   │   └── HeavyPlaylistFormatSection.tsx         # Playlist viewer
│   ├── file/           # File download components
│   │   └── DirectDownloadSection.tsx  # Universal file downloads
│   └── menuBar/        # Application shell
│       ├── MenuBar.tsx               # Custom window controls
│       └── ThemeToggleButton.tsx     # Dark/light mode toggle
├── store/              # Zustand state management
│   ├── UserInputVideoStore.ts       # Video input and metadata
│   ├── DownloadStore.ts              # Download operations
│   ├── HeavyPlaylistStore.ts         # Playlist processing
│   ├── DatabaseStore.ts              # SQLite operations
│   ├── ApplicationStore.ts           # Version management
│   ├── ThemeStore.ts                 # UI theme persistence
│   └── FileStore.ts                  # Direct file handling
├── interfaces/         # TypeScript definitions
│   ├── video/          # Video-related types
│   ├── playlist/       # Playlist interfaces
│   ├── database/       # Database schemas
│   └── application/    # App configuration types
└── lib/               # External integrations
    └── SupabaseClient.ts            # Optional analytics

src-tauri/             # Rust backend
├── src/lib.rs         # Core Rust functionality
├── Cargo.toml         # Dependencies and configuration
└── tauri.conf.json    # Application settings
```

## Installation and Development

### System Requirements

**Critical Dependency:**
```bash
# yt-dlp must be installed and available in PATH
yt-dlp --version

# Installation methods:
python -m pip install -U yt-dlp      # Recommended
# OR download standalone binary from GitHub releases
```

### Development Setup

```bash
# Clone and install
git clone https://github.com/AhmedTrooper/OSGUI.git
cd OSGUI
npm install

# Development workflow
npm run tauri:dev        # Full development with hot reload
npm run dev             # Frontend only development server

# Production builds
npm run tauri:build     # Create platform binaries

# Code quality
npm run lint           # ESLint validation
npm run format         # Prettier code formatting
npm run type-check     # TypeScript compilation check
```

## Known Limitations

### Download Process Constraints
- Pause functionality terminates the download process rather than suspending it
- Failed downloads cannot resume from partial completion
- No automatic retry mechanism for network interruptions
- Large playlist processing may impact UI responsiveness

### System Integration
- Requires specific yt-dlp installation (not youtube-dl or other variants)
- Custom window decorations may behave differently across desktop environments
- Limited accessibility support for keyboard navigation and screen readers

### Current Implementation Status
- Desktop-focused interface (mobile layouts not optimized)
- SQLite database grows over time without automatic cleanup
- Error handling relies on toast notifications rather than detailed error logs

## Application Interface

| Video Input & Processing | Playlist Management | Download Queue |
|--------------------------|---------------------|----------------|
| ![Video Input](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/form001.png) | ![Playlist View](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pllist003.png) | ![Download Management](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pause.png) |

---

**Version:** 0.3.0  
**Author:** AhmedTrooper  
**License:** MIT  
**Repository:** https://github.com/AhmedTrooper/OSGUI
