# 🎆 OSGUI - Enhanced yt-dlp Desktop GUI

A modern, cross-platform desktop application providing an intuitive graphical interface for `yt-dlp` with advanced download management, playlist support, and real-time progress tracking.

**Tech Stack:** [Tauri v2](https://tauri.app/) + [React 18](https://react.dev/) + [TypeScript 5.6](https://www.typescriptlang.org/) + [Zustand](https://github.com/pmndrs/zustand) + [HeroUI](https://www.heroui.com/) + [SQLite](https://www.sqlite.org/)

## 🚀 Core Features

### **Video Download Management**
- **Single Video Downloads** with intelligent format detection and quality selection
- **Real-time Progress Tracking** with live download status and progress indicators
- **Pause/Resume Downloads** with database persistence across app restarts
- **Download Queue Management** with SQLite database backend
- **Custom Format Selection** supporting manual video+audio stream combination

### **Playlist Processing**
- **Complete Playlist Downloads** with batch processing capabilities
- **Selective Video Selection** from playlists with individual quality control
- **Quality Presets** (Best, 4K/2160p, 2K/1440p, 1080p, 720p, Audio-only)
- **Playlist Metadata Extraction** with title, URL, and entry information
- **Organized Downloads** with playlist-specific folder structures

### **Direct File Downloads**
- **Direct URL Support** for any file type beyond video content
- **File Title Generation** with automatic and manual title options  
- **Clipboard Integration** for URL and title paste functionality
- **Universal Download Format** (DFU) for non-video content

### **Advanced UI/UX**
- **Dark/Light Theme Toggle** with system preference detection
- **Responsive Design** optimized for desktop usage
- **Custom Decorations** with transparent window and native controls
- **Toast Notifications** for user feedback and status updates
- **Error Boundaries** with comprehensive error handling

## 🖼️ Application Screenshots

| **Video Input & Format Selection** | **Playlist Management** | **Download Queue** |
|-------------------------------------|------------------------|-------------------|
| ![Video Input Form](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/form001.png) | ![Playlist View](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pllist003.png) | ![Download Controls](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pause.png) |

| **Format Dropdown Selection** | **Selected Playlist Items** | **Application Architecture** |
|-------------------------------|----------------------------|----------------------------|
| ![Format Selection](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/slpdown.png) | ![Selected Videos](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/selectedplaylist.png) | ![System DFD](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/dfd01.png) |

> 📁 **All UI Assets Available**: [resources_github/](https://github.com/AhmedTrooper/OSGUI/tree/main/resources_github)

## 🏗️ Technical Architecture

### **State Management with Zustand Stores**
```typescript
// Video input and information management
export const useUserInputVideoStore = create<UserInputVideoStoreInterface>((set, get) => ({
  videoUrl: "",
  downloadsArr: [],
  videoInformation: null,
  downloadPlaylist: true,
  videoToPause: null,
  
  fetchVideoInformation: async () => {
    // Dual command approach for video vs playlist detection
    const videoCommand = Command.create("ytDlp", ["--dump-json", videoUrl.trim()]);
    const playlistCommand = Command.create("ytDlp", [
      "--flat-playlist", "--dump-single-json", "--yes-playlist", videoUrl.trim()
    ]);
    // Dynamic command selection based on downloadPlaylist toggle
  },
}));
```

### **SQLite Database Schema**
```typescript
// Complete download tracking with playlist support
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

### **Multi-Pattern Download System**
```typescript
// Quality-based download with format strings
export enum LightPlaylistVideoQuality {
  BEST = "bestvideo+bestaudio",
  MAX4K = "bestvideo[height<=2160]+bestaudio",
  MAX2K = "bestvideo[height<=1440]+bestaudio", 
  MAX1080P = "bestvideo[height<=1080]+bestaudio",
  MAX720P = "bestvideo[height<=720]+bestaudio",
  AUDIOONLY = "bestaudio"
}

// Command generation with output templates
const coreDownloadCommand = Command.create("ytDlp", [
  "-f", formatString,
  "-o", `${downloadDirectory}/OSGUI/%(title)s${formatString}.%(ext)s`,
  videoUrl
]);
```

## 🖼️ Application Interface

| **Video Input & Search** | **Playlist Management** | **Format Selection** |
|--------------------------|------------------------|---------------------|
| ![Form](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/form001.png) | ![Playlist](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pllist003.png) | ![Dropdown](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/slpdown.png) |

| **Download Controls** | **Selected Videos** | **System Architecture** |
|----------------------|-------------------|------------------------|
| ![Pause](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/pause.png) | ![Selected Playlist](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/selectedplaylist.png) | ![DFD01](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/dfd01.png) |

| **Data Flow Diagram** |
|----------------------|
| ![DFD002](https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/resources_github/dfd002.png) |

> 📁 Complete UI assets in [`resources_github/`](https://github.com/AhmedTrooper/OSGUI/tree/main/resources_github)

## � Project Structure & Codebase

```
OSGUI/
├── src/                                    # React Frontend Source
│   ├── components/                         # UI Component Library
│   │   ├── ErrorBoundary.tsx               # Global error handling
│   │   ├── file/                          # File download components  
│   │   │   └── DirectDownloadSection.tsx   # Direct URL file downloads
│   │   ├── footer/                        # App footer components
│   │   │   ├── FooterBase.tsx             # Main footer container
│   │   │   └── YtDlp.tsx                  # yt-dlp version display
│   │   ├── menuBar/                       # Top navigation & controls
│   │   │   ├── MenuBar.tsx                # Window controls & navigation
│   │   │   ├── DrawerComponent.tsx        # Mobile responsive drawer
│   │   │   ├── PlaylistInputSection.tsx   # Playlist URL input form
│   │   │   ├── TrashComponent.tsx         # Database cleanup button
│   │   │   ├── TutorialSection.tsx        # Help & tutorial content
│   │   │   └── VersionComponent.tsx       # Version & update info
│   │   ├── playlist/                      # Playlist management UI
│   │   │   ├── CompletePlaylistDownloadComponent.tsx    # Batch downloads
│   │   │   ├── HeavyPlaylistFormatSection.tsx          # Playlist viewer
│   │   │   ├── SelectedLightEntries.tsx               # Selected videos
│   │   │   └── SelectedPlaylistDownloadComponent.tsx  # Selective downloads
│   │   └── video/                         # Video download components
│   │       ├── DownloadSection.tsx        # Download queue & progress
│   │       ├── DownloadsHeader.tsx        # Queue header controls
│   │       ├── FilterDownloads.tsx        # Download filtering
│   │       ├── FormatSection.tsx          # Format selection UI
│   │       ├── OpenDialogSection.tsx      # Video info modal
│   │       ├── OpenHeavyDialogSection.tsx # Playlist info modal
│   │       ├── SortContent.tsx           # Download sorting
│   │       ├── UserInputSection.tsx       # Main URL input form
│   │       └── VideoContainer.tsx         # Main video container
│   ├── store/                            # Zustand State Management
│   │   ├── ApplicationStore.ts           # App version & update logic
│   │   ├── DatabaseStore.ts              # SQLite database operations
│   │   ├── DownloadStore.ts              # Download queue management
│   │   ├── FileStore.ts                  # Direct file download state
│   │   ├── HeavyPlaylistStore.ts         # Playlist processing logic  
│   │   ├── OsInfoStore.ts                # Operating system detection
│   │   ├── ThemeStore.ts                 # Dark/light theme toggle
│   │   ├── UserInputVideoStore.ts        # Video input & metadata
│   │   ├── UtilityStore.ts               # Helper functions
│   │   ├── utils.ts                      # Store utilities
│   │   └── VideoUtility.ts               # Video processing helpers
│   ├── interfaces/                       # TypeScript Type Definitions
│   │   ├── application/                  # App configuration types
│   │   │   ├── ApplicationInterface.ts   # Main app interface
│   │   │   └── MetadataInterface.ts      # Update metadata schema
│   │   ├── database/                     # Database type definitions
│   │   │   └── DatabaseInterface.ts      # SQLite operations interface
│   │   ├── file/                        # File handling interfaces
│   │   │   └── IFileStore.tsx           # File download state types
│   │   ├── playlist/                    # Playlist-related types
│   │   │   ├── HeavyPlaylistStoreInterface.ts     # Playlist store types
│   │   │   ├── PlaylistInformationInterface.ts   # Playlist data schema
│   │   │   └── QualityEnumsInterface.ts          # Quality preset enums
│   │   ├── theme/                       # Theme system types  
│   │   ├── update/                      # Update system interfaces
│   │   ├── utility/                     # Utility function types
│   │   └── video/                       # Video processing types
│   │       ├── DownloadStoreInterface.ts         # Download management
│   │       ├── UserInputVideoStoreInterface.ts  # Video input types
│   │       └── VideoInformationInterface.ts     # Video metadata schema
│   ├── lib/                             # External Service Integration
│   │   └── SupabaseClient.ts            # Optional analytics client
│   ├── routes/                          # Application Pages
│   │   ├── Home.tsx                     # Main application interface
│   │   └── About.tsx                    # About page with app info
│   ├── ui/                              # Custom UI Components
│   │   └── ThemeToggleButton.tsx        # Dark/light mode toggle
│   ├── types/                           # Global type definitions
│   │   └── global.ts                    # Shared application types
│   ├── hooks/                           # Custom React hooks
│   │   └── index.ts                     # Hook exports
│   ├── assets/                          # Static assets
│   │   └── react.svg                    # React logo
│   ├── database.types.ts                # Supabase & local DB types
│   ├── App.tsx                          # Root application component
│   ├── main.tsx                         # React application entry
│   ├── App.css                          # Global application styles  
│   ├── main.css                         # Base CSS imports
│   └── vite-env.d.ts                    # Vite environment types
├── src-tauri/                           # Rust Backend (Tauri v2)
│   ├── src/
│   │   ├── main.rs                      # Application entry point
│   │   └── lib.rs                       # Core Rust functionality
│   ├── Cargo.toml                       # Rust dependencies
│   ├── Cargo.lock                       # Dependency lock file
│   ├── tauri.conf.json                  # Tauri app configuration
│   ├── build.rs                         # Build script
│   ├── capabilities/
│   │   └── default.json                 # Security capabilities
│   └── icons/                          # Application icons
├── public/                              # Static public assets
│   ├── tauri.svg                        # Tauri logo
│   └── vite.svg                         # Vite logo
├── update/                              # Update system
│   └── metadata.json                    # Version & release metadata
├── resources_github/                    # Documentation assets
│   ├── *.png                           # Screenshot images
├── Configuration & Build Files
│   ├── package.json                     # NPM dependencies & scripts
│   ├── tsconfig.json                    # TypeScript configuration
│   ├── tsconfig.node.json               # Node TypeScript config
│   ├── vite.config.ts                   # Vite build configuration
│   ├── tailwind.config.js               # Tailwind CSS config
│   ├── postcss.config.js                # PostCSS configuration
│   ├── install_script.sh                # Enhanced installation script
│   ├── quick_install.sh                 # Quick setup script
│   └── README.md                        # This documentation
```

### **Architecture Overview**
- **Frontend**: React 18 + TypeScript 5.6 with HeroUI component library
- **State Management**: Zustand stores with persistent storage
- **Backend**: Tauri v2 with Rust for system integration  
- **Database**: SQLite for local data + optional Supabase analytics
- **Build System**: Vite 6 with TypeScript, Tailwind CSS, ESLint

## 🛠️ Installation & Development

### **Prerequisites**
```bash
# Required runtime dependencies
yt-dlp --version     # Video extraction (must be in PATH as 'yt-dlp')
ffmpeg -version      # Media processing (required for merging)

# Development environment  
node --version       # Node.js 18.0.0+ 
npm --version        # npm 9.0.0+
rustc --version      # Rust toolchain (latest stable)
```

### **Development Commands**
```bash
# Clone and setup
git clone https://github.com/AhmedTrooper/OSGUI.git
cd OSGUI
npm install

# Development (from package.json)
npm run dev                  # Frontend development server
npm run tauri:dev           # Full Tauri development with hot reload
npm run dev:debug           # Development with debug mode

# Production builds
npm run build               # Build frontend bundle  
npm run tauri:build         # Create production Tauri binary
npm run tauri:build:debug   # Debug build with symbols

# Code quality
npm run type-check          # TypeScript validation
npm run lint                # ESLint checking
npm run lint:fix            # Auto-fix linting issues
npm run format              # Prettier code formatting
npm run format:check        # Check formatting without changes

# Testing
npm run test                # Run Vitest test suite
npm run test:ui             # Vitest UI interface
npm run test:run            # Single test run
npm run test:coverage       # Test coverage analysis

# Maintenance
npm run clean               # Clean build artifacts
npm run clean:all           # Clean everything including node_modules
npm run deps:check          # Check for dependency updates
npm run deps:update         # Update dependencies
```

### **Installation Scripts**
```bash
# Quick installation (Linux)
./quick_install.sh          # Fast install for development
./install_script.sh         # Full installation with old version cleanup
```

## 🧩 System Requirements

| **Component** | **Requirement** | **Purpose** |
|---------------|----------------|-------------|
| **yt-dlp** | Latest version | Video/audio extraction from URLs |
| **ffmpeg** | 4.0+ | Media processing, format conversion |
| **ffplay** | Included with ffmpeg | Media playback capabilities |
| **ffprobe** | Included with ffmpeg | Media file analysis |

> ⚠️ **Critical:** `yt-dlp` must be accessible as `yt-dlp` command in system PATH  
> 🔄 **Update Frequency:** yt-dlp releases bi-weekly - keep updated for site compatibility

### **Installation Methods**
```bash
# yt-dlp installation options
python -m pip install -U yt-dlp                    # Python/pip
# OR download standalone binary from releases page

# FFmpeg installation (platform-specific)
# Windows: Download from https://ffmpeg.org/
# macOS: brew install ffmpeg  
# Linux: apt install ffmpeg / yum install ffmpeg
```

### **Verification Commands**
```bash
yt-dlp --version    # Should display current version
ffmpeg             # Should show help/usage info
ffplay             # Should show help/usage info  
ffprobe            # Should show help/usage info
```

## 🎯 Actual Features & Functionality

### **1. Video Download System**
```typescript
// UserInputSection.tsx - URL input with playlist toggle
<Switch isSelected={downloadPlaylist} onChangeCapture={() => setDownloadPlaylist(!downloadPlaylist)}>
  <List className={clsx("", {
    "text-green-600": downloadPlaylist,
    "text-red-600": !downloadPlaylist,
  })} />
</Switch>

// Dual processing based on playlist toggle
const videoCommand = Command.create("ytDlp", ["--dump-json", videoUrl.trim()]);
const playlistCommand = Command.create("ytDlp", [
  "--flat-playlist", "--dump-single-json", "--yes-playlist", videoUrl.trim()
]);
```

### **2. Download Management & Database**
```typescript
// DownloadStore.ts - Real download handler implementation
downloadHandler: async (formatString, videoUrl, videoTitle, directURL = false) => {
  const db = await Database.load("sqlite:osgui.db");
  const uniqueId = nanoid(20);
  
  // Command creation with format selection
  let coreDownloadCommand = Command.create("ytDlp", [
    "-f", formatString,
    "-o", `${downloadDirectory}/OSGUI/%(title)s${formatString}.%(ext)s`,
    videoUrl
  ]);
  
  // Real-time progress tracking with database updates
  coreDownloadCommand.stdout.on("data", async (data) => {
    await db.execute(`UPDATE DownloadList SET tracking_message = $1 WHERE unique_id = $2`, 
      [data.toString().trim(), uniqueId]);
  });
}
```

### **3. Playlist Processing**
```typescript
// HeavyPlaylistStore.ts - Complete playlist functionality
export enum LightPlaylistVideoQuality {
  BEST = "bestvideo+bestaudio",
  MAX4K = "bestvideo[height<=2160]+bestaudio", 
  MAX2K = "bestvideo[height<=1440]+bestaudio",
  MAX1080P = "bestvideo[height<=1080]+bestaudio",
  MAX720P = "bestvideo[height<=720]+bestaudio",
  AUDIOONLY = "bestaudio"
}

// Individual video downloads from playlists
lightPlaylistSingleDownloadHandler: async (fileTitle, fileUrl, playlistTitle, fileFormat) => {
  // Downloads to organized folders: Downloads/OSGUI/PlaylistName/
  "-o", `${downloadDirectory}/OSGUI/${playlistTitle}/%(title)s${formatString}.%(ext)s`
}
```

### **4. Direct File Download System**
```typescript
// DirectDownloadSection.tsx - File download beyond videos
const DirectDownloadSection = () => {
  // Supports any file type with direct URLs
  const downloadHandler = useDownloadStore((state) => state.downloadHandler);
  
  // Universal download with "DFU" format identifier
  downloadHandler("DFU", fileUrl, fileTitle, true)
}
```

### **5. Application Management**
```typescript
// ApplicationStore.ts - Version checking and updates
fetchAppVersion: async () => {
  // Checks GitHub metadata for updates
  let response = await fetch("https://raw.githubusercontent.com/AhmedTrooper/OSGUI/main/update/metadata.json");
  
  // Compares local vs online versions
  if (localApplicationVersion < onlineApplicationVersion) {
    addToast({ title: "Application Update Available" });
  }
}

// DatabaseStore.ts - Optional analytics
supabaseQueryInsert: async () => {
  // Collects system info only if Supabase is configured
  const appInformationString = `${name}_${version}_${tauriVersion}_${identifier}`;
  await client.from("UniversalApplicationUsages").insert({...});
}
```

### **6. Real Implementation Details**
- **Database Schema**: 12 fields including playlist verification and tracking messages
- **Error Handling**: Comprehensive error boundaries and toast notifications  
- **State Management**: 8 Zustand stores for different app concerns
- **Clipboard Integration**: Read/write functionality for URLs and file links
- **Theme System**: Dark/light mode with localStorage persistence
- **Custom Window**: Decorations disabled with transparent background
- **File Organization**: Downloads saved to `Downloads/OSGUI/` with playlist folders

## 🔧 Implementation Details

### **Comprehensive TypeScript Architecture** 
```typescript
// Complete interface coverage across 4+ interface directories
src/interfaces/
├── application/        # App configuration & metadata  
├── database/          # SQLite schema definitions
├── file/              # File download state types
├── playlist/          # Playlist processing interfaces
├── video/             # Video metadata & download types
└── + theme/, update/, utility/ directories

// Strict typing with advanced generics in global.ts
export interface StoreState<T = unknown> { ... }
export type ComponentWithRef<T, P = {}> = React.ForwardRefExoticComponent<...>
```

### **8 Specialized Zustand Stores**
```typescript
// Modular state management with clear separation
├── ApplicationStore.ts     # Version checking, yt-dlp updates  
├── DatabaseStore.ts        # SQLite CRUD operations
├── DownloadStore.ts        # Download queue & progress tracking
├── FileStore.ts           # Direct file download handling
├── HeavyPlaylistStore.ts  # Complete playlist processing
├── ThemeStore.ts          # Dark/light mode persistence  
├── UserInputVideoStore.ts # Video URL input & metadata
└── UtilityStore.ts        # Helper functions & parsing
```

### **Advanced UI Component System**
```typescript
// HeroUI integration with custom styling
import { Button, Card, Input, Switch, Popover, Spinner } from "@heroui/react";

// Custom components with theme integration  
<Switch isSelected={downloadPlaylist} color="success">
  <List className={clsx("", {
    "text-green-600": downloadPlaylist,
    "text-red-600": !downloadPlaylist
  })} />
</Switch>

// Toast notification system for user feedback
addToast({
  title: "Download Completed",
  description: "Video downloaded successfully!",
  color: "success",
  timeout: 2000
});
```

### **Real System Integration Features**
```typescript
// Tauri plugin utilization
import { Command } from "@tauri-apps/plugin-shell";           # Shell command execution
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";  # Clipboard
import { downloadDir, documentDir } from "@tauri-apps/api/path";             # File system
import Database from "@tauri-apps/plugin-sql";               # SQLite integration
import { platform, arch, version } from "@tauri-apps/plugin-os";            # OS info

// Window customization in tauri.conf.json
"decorations": false,    # Custom title bar
"transparent": true,     # Transparent background
"resizable": true,       # User resizable
"minWidth": 700,         # Minimum dimensions
"minHeight": 500
```

### **Robust Error Handling & Recovery**
```typescript
// Global error boundary implementation
export const ErrorBoundary = ({ children, onError }) => {
  // Catches and handles React component errors
};

// Database error handling with user feedback
try {
  await db.execute("CREATE TABLE IF NOT EXISTS DownloadList ...");
} catch (err) {
  addToast({
    title: "Database Error", 
    description: "Failed to initialize: " + err.message,
    color: "danger"
  });
}
```

### **Development Tooling & Quality**
```json
// Complete development pipeline from package.json
{
  "scripts": {
    "lint": "eslint src --ext ts,tsx --max-warnings 0",
    "format": "prettier --write src/**/*.{ts,tsx,js,jsx,json,css,md}",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}

// Pre-commit hooks with husky + lint-staged
"lint-staged": {
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,css,md}": ["prettier --write"]
}
```

## 📊 Technical Stack & Dependencies

### **Core Technology Matrix**
| **Frontend** | **Backend** | **Database** | **Development** |
|-------------|------------|-------------|----------------|
| React 18.3.1 | Tauri v2 | SQLite (local) | Vite 6.0.3 |
| TypeScript 5.6.2 | Rust 2021 Edition | Supabase (optional) | ESLint 9.15.0 |
| Zustand 5.0.5 | Shell Plugin v2.2.2 | localStorage | Prettier 3.3.3 |
| HeroUI 2.7.9 | SQL Plugin v2.2.1 | Browser APIs | Vitest 2.1.8 |

### **Key Dependencies from package.json**
```json
"dependencies": {
  "@heroui/react": "^2.7.9",              // UI component library
  "@tauri-apps/api": "^2",                 // Tauri frontend API
  "@tauri-apps/plugin-shell": "^2.2.2",   // Command execution
  "@tauri-apps/plugin-sql": "^2.2.1",     // SQLite integration  
  "@tauri-apps/plugin-clipboard-manager": "^2.3.0",  // Clipboard access
  "@supabase/supabase-js": "^2.57.4",     // Optional analytics
  "react": "^18.3.1",                     // UI framework
  "zustand": "^5.0.5",                    // State management
  "nanoid": "^5.1.5",                     // Unique ID generation
  "lodash": "^4.17.21",                   // Utility functions
  "clsx": "^2.1.1"                        // Conditional CSS classes
}
```

### **Rust Backend Dependencies (Cargo.toml)**
```toml
[dependencies]
tauri = { version = "2", features = [] }        # Core framework
tauri-plugin-shell = "2"                        # Command execution
tauri-plugin-sql = { version = "2", features = ["sqlite"] }  # Database
tauri-plugin-fs = "2"                           # File system access
tauri-plugin-notification = "2"                 # System notifications
tauri-plugin-clipboard-manager = "2"            # Clipboard operations
serde = { version = "1", features = ["derive"] } # Serialization
```

### **Application Configuration**
```json
// tauri.conf.json - Real application settings
{
  "productName": "OSGUI",
  "version": "0.3.0",
  "identifier": "com.osgui.sutsoa.app",
  "windows": [{
    "title": "OSGUI",
    "width": 800, "height": 600,
    "decorations": false,        // Custom window chrome
    "transparent": true,         // Transparent background
    "minWidth": 700, "minHeight": 500
  }]
}
```

### **Build & Bundle Targets**
```bash
# From package.json - Production build outputs
npm run tauri:build           # Creates platform-specific bundles:
├── Linux: .deb, .rpm, .AppImage
├── Windows: .msi, .exe  
├── macOS: .dmg, .app

# Development workflow
npm run tauri:dev            # Hot-reload development
npm run build:analyze        # Bundle analysis
npm run bundle:analyze       # Vite bundle analyzer
```

### **Quality Assurance Pipeline**
```json
// Complete code quality setup
"devDependencies": {
  "@typescript-eslint/eslint-plugin": "^8.15.0",     // TS linting
  "@typescript-eslint/parser": "^8.15.0",            // TS parsing
  "eslint-plugin-react-hooks": "^5.0.0",             // React rules
  "husky": "^9.1.7",                                 // Git hooks
  "lint-staged": "^15.2.10",                         // Pre-commit linting
  "vitest": "^2.1.8",                                // Testing framework
  "@vitest/ui": "^2.1.8"                            // Test UI interface
}
```

## 🚧 Current Limitations & Known Issues

### **yt-dlp Dependency**
- **Critical**: Must have `yt-dlp` installed and accessible via PATH as `yt-dlp` command
- **Version Compatibility**: Works with yt-dlp 2025.09.05+ (auto-checked via ApplicationStore)
- **Platform-specific**: Installation varies by OS (pip, package managers, standalone binary)

### **Download Limitations**  
- **No Resume**: Downloads that fail cannot be resumed from partial progress
- **Process Management**: Paused downloads terminate the process rather than suspending
- **Error Recovery**: Failed downloads require manual restart with same parameters
- **Network Issues**: No automatic retry mechanism for network interruptions

### **UI/UX Considerations**
- **Desktop-focused**: Not optimized for mobile interfaces (mobile OS detection present but limited UI)
- **Window Management**: Custom decorations may not integrate perfectly with all desktop environments
- **Accessibility**: Limited keyboard navigation and screen reader support
- **Performance**: Large playlists (500+ videos) may impact UI responsiveness

---

## 🎯 Usage Instructions

### **Basic Video Download**
1. **URL Input**: Enter video URL in the main input field
2. **Toggle Switch**: Ensure playlist toggle is OFF (red) for single videos  
3. **Search**: Click search button to fetch video information
4. **Format Selection**: Choose quality/format from the generated options
5. **Download**: Click download button to start the process

### **Playlist Processing**
1. **URL Input**: Enter playlist URL
2. **Toggle Switch**: Turn playlist toggle ON (green)
3. **Search**: Click search to fetch playlist metadata
4. **Selection Mode**:
   - **Individual**: Click quality buttons on each video
   - **Batch**: Use "Complete Playlist Download" section
   - **Selective**: Use "Select" buttons and batch download selected

### **Direct File Downloads**
1. **Direct URL**: Use "Direct File Download" section
2. **File Info**: Enter/paste direct download URL and title
3. **Download**: Uses universal download format (DFU)
4. **File Types**: Supports any direct-downloadable file format

---

<div align="center">

**Modern Cross-Platform Desktop Application**  
*Built with TypeScript, React, Tauri v2, and SQLite*

[![Version](https://img.shields.io/badge/Version-0.3.0-blue?style=flat-square)](https://github.com/AhmedTrooper/OSGUI)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square&logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**Developed by [AhmedTrooper](https://github.com/AhmedTrooper)**  
*Open source yt-dlp desktop GUI with modern web technologies*

</div>
