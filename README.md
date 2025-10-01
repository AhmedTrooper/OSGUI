# 🎆 YT-DLP GUI - Professional Desktop Application

A comprehensive desktop GUI for `yt-dlp` built with modern web technologies and robust architecture patterns. Features advanced playlist management, format selection, download tracking, and database persistence.

**Tech Stack:** [Tauri v2](https://tauri.app/) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Zustand](https://github.com/pmndrs/zustand) + [HeroUI](https://www.heroui.com/) + [SQLite](https://www.sqlite.org/)

## 🚀 Key Features

### **Video & Playlist Management**
- **Individual Video Downloads** with format selection and quality options
- **Complete Playlist Processing** with batch download capabilities  
- **Selective Playlist Downloads** - choose specific videos from playlists
- **Real-time Download Tracking** with progress monitoring and status updates
- **Pause/Resume Functionality** for active downloads

### **Advanced Format Selection**
- **Intelligent Format Detection** with video/audio stream separation
- **Quality-based Downloads** (Best, 4K, 2K, 1080p, 720p, Audio-only)
- **Custom Format Selection** with manual video+audio stream combination
- **Format Filtering** with media/non-media view options

### **Data Management & Persistence**
- **SQLite Database Integration** for download history and tracking
- **Download Queue Management** with database-backed persistence  
- **System Information Collection** with privacy-focused analytics
- **Theme Persistence** with localStorage integration

## �️ Technical Architecture

### **State Management with Zustand**
```typescript
// Modular store architecture with typed interfaces
export const useUserInputVideoStore = create<UserInputVideoStoreInterface>((set, get) => ({
  videoUrl: "",
  downloadsArr: [],
  videoInformation: null,
  fetchVideoInformation: async () => {
    // JSON extraction via yt-dlp commands
    const videoCommand = Command.create("ytDlp", ["--dump-json", videoUrl.trim()]);
    const playlistCommand = Command.create("ytDlp", [
      "--flat-playlist", "--dump-single-json", "--yes-playlist", videoUrl.trim()
    ]);
  },
}));
```

### **Database Operations**
```typescript
// SQLite integration with Tauri
await db.execute(`CREATE TABLE IF NOT EXISTS DownloadList (
  id VARCHAR(255) PRIMARY KEY,
  unique_id VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  isPaused BOOLEAN DEFAULT false,
  format_id VARCHAR(255) NOT NULL,
  web_url VARCHAR(255),
  title VARCHAR(255),
  tracking_message TEXT,
  playlistVerification TEXT
);`);
```

### **Advanced Download System**
```typescript
// Download handler with command execution
const coreDownloadCommand = Command.create("ytDlp", [
  "-f", fileFormat,
  "-o", `${downloadDirectory}/OSGUI/%(title)s.%(ext)s`,
  videoUrl
]);
const childDataProcess = await coreDownloadCommand.spawn();
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

## 📦 Project Structure & Architecture

```
OSGUI/
├── src/
│   ├── components/                 # React UI Components
│   │   ├── menuBar/               # Navigation & input components
│   │   │   ├── MenuBar.tsx        # Main navigation bar
│   │   │   ├── PlaylistInputSection.tsx  # Playlist URL input
│   │   │   └── DrawerComponent.tsx # Mobile drawer menu  
│   │   ├── video/                 # Video-related components
│   │   │   ├── DownloadSection.tsx    # Download queue display
│   │   │   ├── FormatSection.tsx      # Format selection UI
│   │   │   ├── UserInputSection.tsx   # Video URL input
│   │   │   └── VideoContainer.tsx     # Main video container
│   │   ├── playlist/              # Playlist management
│   │   │   ├── HeavyPlaylistFormatSection.tsx    # Full playlist view
│   │   │   ├── CompletePlaylistDownloadComponent.tsx  # Batch download
│   │   │   └── SelectedPlaylistDownloadComponent.tsx  # Selective download
│   │   └── ErrorBoundary.tsx      # Error handling component
│   ├── store/                     # Zustand State Management  
│   │   ├── UserInputVideoStore.ts     # Video input & information
│   │   ├── HeavyPlaylistStore.ts      # Playlist operations
│   │   ├── DownloadStore.ts           # Download management
│   │   ├── DatabaseStore.ts           # SQLite operations
│   │   ├── ApplicationStore.ts        # App lifecycle & updates
│   │   ├── ThemeStore.ts              # Theme management
│   │   └── UtilityStore.ts            # Helper functions
│   ├── interfaces/                # TypeScript Definitions
│   │   ├── video/                     # Video-related interfaces
│   │   ├── playlist/                  # Playlist interfaces  
│   │   ├── database/                  # Database schema
│   │   └── application/               # App configuration
│   ├── lib/                       # External Integrations
│   │   └── SupabaseClient.ts          # Analytics client
│   └── routes/                    # Application Routing
│       ├── Home.tsx               # Main application view
│       └── About.tsx              # About page
├── src-tauri/                     # Rust Backend
│   ├── src/
│   │   ├── main.rs                # Tauri application entry
│   │   └── lib.rs                 # Core Rust functionality  
│   └── tauri.conf.json            # Tauri configuration
└── Configuration Files
    ├── package.json               # Dependencies & build scripts
    ├── vite.config.ts             # Build configuration
    ├── tsconfig.json              # TypeScript configuration
    └── tailwind.config.js         # Styling configuration
```

## � Installation & Development

### **Prerequisites**
```bash
# Required runtime dependencies
yt-dlp --version    # Video extraction tool
ffmpeg -version     # Media processing (mandatory)
ffplay -version     # Media playback  
ffprobe -version    # Media analysis

# Development environment  
node --version      # Node.js 18+
npm --version       # npm 9+
rustc --version     # Rust toolchain
```

### **Setup & Build**
```bash
# Clone and install dependencies
git clone https://github.com/AhmedTrooper/OSGUI.git
cd OSGUI
npm install

# Development mode with hot reload
npm run tauri:dev

# Production build
npm run tauri:build

# Additional development commands
npm run dev          # Frontend only
npm run build        # Build frontend
npm run type-check   # TypeScript validation
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

## 🎯 Core Functionality

### **Video Processing Pipeline**
1. **URL Input** → Video/Playlist detection via switch toggle
2. **Information Extraction** → JSON metadata via yt-dlp commands
3. **Format Analysis** → Audio/Video stream separation and quality detection
4. **Download Management** → Queue-based processing with database tracking
5. **Progress Monitoring** → Real-time status updates and completion tracking

### **Playlist Management Features**  
- **Light Playlist Search** - Fast metadata extraction for playlist overview
- **Heavy Playlist Processing** - Detailed format information for each video
- **Batch Operations** - Download entire playlists with quality selection
- **Selective Downloads** - Choose specific videos from playlist entries
- **Quality Presets** - Best, 4K, 2K, 1080p, 720p, Audio-only options

### **Advanced Format Selection**
```typescript
// Quality enumeration system
export enum LightPlaylistVideoQuality {
  BEST = "best",
  MAX4K = "best[height<=2160]", 
  MAX2K = "best[height<=1440]",
  MAX1080P = "best[height<=1080]", 
  MAX720P = "best[height<=720]",
  AUDIOONLY = "bestaudio"
}
```

### **Database-Driven Download Management**
- **SQLite Integration** - Local persistence for download history
- **Download States** - Active, Completed, Failed, Paused tracking
- **Queue Management** - Add, remove, restart download entries  
- **Analytics Integration** - Optional Supabase telemetry collection
- **Data Cleanup** - Bulk operations for download list management

## 🔧 Development Highlights

### **TypeScript Architecture**
- **Comprehensive Interface Definitions** for all data structures
- **Strict Type Checking** with advanced compiler options
- **Generic Type Utilities** for flexible component patterns
- **Enum-based Configuration** for quality and state management

### **State Management Patterns**
- **Modular Store Architecture** with separation of concerns
- **Async Action Patterns** for API and command operations  
- **Computed State Updates** with reactive data flow
- **Persistence Layer** for theme and application state

### **UI/UX Design**
- **Responsive Component System** with HeroUI integration
- **Dark/Light Theme Support** with localStorage persistence
- **Interactive Download Cards** with progress indicators
- **Contextual Action Buttons** for download management
- **Toast Notification System** for user feedback

### **System Integration**
- **Secure Command Execution** via Tauri's shell plugin
- **Cross-Platform Compatibility** (Windows, macOS, Linux)
- **Native File System Access** for download directory management  
- **Clipboard Integration** for URL input convenience
- **OS Information Collection** for analytics and debugging

## 📊 Technical Implementation

### **Core Technologies**
| **Frontend** | **Backend** | **Database** | **Build Tools** |
|-------------|------------|-------------|---------------|
| React 18 | Tauri v2 | SQLite | Vite 6 |
| TypeScript 5.6 | Rust | Supabase | PostCSS |
| Zustand | Native APIs | Local Storage | Tailwind CSS |
| HeroUI | Shell Commands | IndexedDB | ESLint |

### **Key Design Patterns**
- **Command Pattern** - yt-dlp execution with structured commands
- **Observer Pattern** - Reactive state management with Zustand
- **Repository Pattern** - Database abstraction with type safety
- **Factory Pattern** - Download command generation based on formats
- **Singleton Pattern** - Database connections and client instances

---

<div align="center">

**Modern Desktop Application Development**  
*Showcasing TypeScript, React, Tauri, and Database Integration*

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=flat-square&logo=github)](https://github.com/AhmedTrooper/OSGUI)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square&logo=tauri)](https://tauri.app/)

**Built by [AhmedTrooper](https://github.com/AhmedTrooper)** • MIT License

</div>
