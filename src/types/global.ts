// Global type definitions for the application

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type NonNullable<T> = T extends null | undefined ? never : T;
export type ValueOf<T> = T[keyof T];

// Application States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type NetworkState = 'online' | 'offline' | 'checking';
export type ThemeMode = 'light' | 'dark' | 'system';

// Event Types
export interface AppEvent<T = unknown> {
  type: string;
  payload?: T;
  timestamp: number;
  source?: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  stack?: string;
  recoverable: boolean;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: AppError;
  success: boolean;
  timestamp: number;
  requestId?: string;
}

// Configuration Types
export interface AppConfig {
  apiUrl: string;
  enableAnalytics: boolean;
  enableLogging: boolean;
  theme: ThemeMode;
  language: string;
  features: FeatureFlags;
}

export interface FeatureFlags {
  experimentalFeatures: boolean;
  performanceMonitoring: boolean;
  advancedDownloadOptions: boolean;
  playlistSupport: boolean;
  darkModeToggle: boolean;
}

// Performance Monitoring
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

// Keyboard Shortcuts
export interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  action: string;
  description: string;
  enabled: boolean;
}

// File Operations
export interface FileOperation {
  id: string;
  type: 'download' | 'upload' | 'delete' | 'move' | 'copy';
  status: LoadingState;
  progress: number;
  filename: string;
  size?: number;
  error?: AppError;
}

// Toast Notifications
export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// User Preferences
export interface UserPreferences {
  theme: ThemeMode;
  language: string;
  downloadPath: string;
  autoStart: boolean;
  notifications: boolean;
  keyboardShortcuts: KeyboardShortcut[];
  advancedMode: boolean;
}

// Window State
export interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isFocused: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Component Props Helpers
export type PropsWithChildren<P = {}> = P & {
  children?: React.ReactNode;
};

export type ComponentWithRef<T, P = {}> = React.ForwardRefExoticComponent<
  PropsWithChildren<P> & React.RefAttributes<T>
>;

// Store Types
export interface StoreState {
  loading: LoadingState;
  error: AppError | null;
  lastUpdated: number;
}

export interface PersistConfig {
  name: string;
  version: number;
  storage: 'localStorage' | 'sessionStorage' | 'indexedDB';
  whitelist?: string[];
  blacklist?: string[];
}

// Command Types for Shell Operations
export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  encoding?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
  signal: string | null;
  killed: boolean;
}

// Event Emitter Types
export interface EventEmitter {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  once(event: string, listener: (...args: unknown[]) => void): void;
}

// Form Types
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  disabled?: boolean;
  required?: boolean;
}

export type FormState<T> = {
  [K in keyof T]: FormField<T[K]>;
};

// Log Levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  source: string;
  context?: Record<string, unknown>;
}

// Environment
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  VITE_APP_NAME: string;
  VITE_APP_VERSION: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_ENABLE_ANALYTICS: boolean;
  VITE_ENABLE_LOGGING: boolean;
}

// Export all types from this module
export * from '@/database.types';
export * from '@/interfaces/application/ApplicationInterface';
export * from '@/interfaces/video/VideoInformationInterface';
export * from '@/interfaces/database/DatabaseInterface';