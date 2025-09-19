// Enhanced Zustand store utilities for better patterns and performance

import { StateCreator } from 'zustand';
import { StoreState, AppError, LoadingState } from '@/types/global';

// Declare global types for dev tools
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: {
      connect: (options: { name: string; trace: boolean }) => unknown;
    };
    __STORES__?: Record<string, unknown>;
  }
}

// Create a logger middleware for debugging in development
export const logger = <T extends object>(
  f: StateCreator<T, [], [], T>,
  name?: string
): StateCreator<T, [], [], T> =>
  (set, get, store) => {
    const loggedSet: typeof set = (partial, replace) => {
      if (import.meta.env.DEV) {
        console.group(`🏪 ${name || 'Store'} Update`);
        console.log('Previous State:', get());
      }
      
      if (replace === true) {
        set(partial as T | ((state: T) => T), true);
      } else {
        set(partial, replace);
      }
      
      if (import.meta.env.DEV) {
        console.log('New State:', get());
        console.groupEnd();
      }
    };

    return f(loggedSet, get, store);
  };

// Performance middleware to track store update performance
export const performanceMiddleware = <T extends object>(
  f: StateCreator<T, [], [], T>,
  name?: string
): StateCreator<T, [], [], T> =>
  (set, get, store) => {
    const timedSet: typeof set = (partial, replace) => {
      const start = Date.now();
      
      if (replace === true) {
        set(partial as T | ((state: T) => T), true);
      } else {
        set(partial, replace);
      }
      
      const end = Date.now();
      
      if (import.meta.env.DEV && end - start > 10) {
        console.warn(`⚡ Slow store update in ${name}: ${end - start}ms`);
      }
    };

    return f(timedSet, get, store);
  };

// Error handling middleware
export const errorHandler = <T extends object>(
  f: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> =>
  (set, get, store) => {
    const safeSet: typeof set = (partial, replace) => {
      try {
        if (replace === true) {
          set(partial as T | ((state: T) => T), true);
        } else {
          set(partial, replace);
        }
      } catch (error) {
        console.error('Store update error:', error);
        // You could dispatch to a global error store here
      }
    };

    return f(safeSet, get, store);
  };

// Base store state with common loading/error patterns
export interface BaseStoreState extends StoreState {
  loading: LoadingState;
  error: AppError | null;
  lastUpdated: number;
}

// Base store actions
export interface BaseStoreActions {
  setLoading: (loading: LoadingState) => void;
  setError: (error: AppError | null) => void;
  updateLastUpdated: () => void;
  reset: () => void;
}

// Create base store state creator
export const createBaseStoreSlice = <T extends BaseStoreState & BaseStoreActions>(
  initialState: Omit<T, keyof BaseStoreActions>
): StateCreator<T, [], [], BaseStoreActions> => (set) => ({
  setLoading: (loading: LoadingState) => set(() => ({ loading } as Partial<T>)),
  setError: (error: AppError | null) => set(() => ({ error } as Partial<T>)),
  updateLastUpdated: () => set(() => ({ lastUpdated: Date.now() } as Partial<T>)),
  reset: () => set(() => ({
    ...initialState,
    loading: 'idle' as LoadingState,
    error: null,
    lastUpdated: Date.now(),
  } as Partial<T>)),
});

// Async action wrapper with automatic loading states
export const createAsyncAction = <TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>,
  setLoading: (loading: LoadingState) => void,
  setError: (error: AppError | null) => void,
  updateLastUpdated: () => void
) => {
  return async (...args: TArgs): Promise<TReturn | null> => {
    try {
      setLoading('loading');
      setError(null);
      
      const result = await action(...args);
      
      setLoading('success');
      updateLastUpdated();
      return result;
    } catch (error) {
      console.error('Async action failed:', error);
      
      const appError: AppError = {
        code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        recoverable: true,
        ...(error instanceof Error && error.stack && { stack: error.stack }),
      };
      
      setError(appError);
      setLoading('error');
      return null;
    }
  };
};

// Debounce utility for store actions
export const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  wait: number
) => {
  let timeout: NodeJS.Timeout;
  return (...args: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for store actions
export const throttle = <T extends unknown[]>(
  func: (...args: T) => void,
  limit: number
) => {
  let inThrottle: boolean;
  return (...args: T) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Store selector helpers
export const createSelector = <T, R>(
  selector: (state: T) => R
) => selector;

// Computed state helper
export const createComputed = <T extends Record<string, unknown>, R>(
  dependencies: ((state: T) => unknown)[],
  compute: (state: T) => R
) => {
  const cache = new Map<string, R>();
  
  return (state: T): R => {
    const depValues = dependencies.map(dep => dep(state));
    const cacheKey = JSON.stringify(depValues);
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }
    
    const value = compute(state);
    cache.set(cacheKey, value);
    
    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }
    
    return value;
  };
};

// Store persistence utility
export const createPersistence = <T>(
  name: string,
  version = 1
) => {
  const key = `store_${name}_v${version}`;
  
  return {
    getItem: (): T | null => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error(`Failed to load persisted state for ${name}:`, error);
        return null;
      }
    },
    
    setItem: (state: T): void => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error(`Failed to persist state for ${name}:`, error);
      }
    },
    
    removeItem: (): void => {
      localStorage.removeItem(key);
    },
  };
};

// Store validation utility
export const validateStoreData = <T>(
  data: unknown,
  validator: (data: unknown) => data is T
): T | null => {
  if (validator(data)) {
    return data;
  }
  console.warn('Store data validation failed:', data);
  return null;
};

// Type guards for store data validation
export const isString = (value: unknown): value is string => 
  typeof value === 'string';

export const isNumber = (value: unknown): value is number => 
  typeof value === 'number' && !isNaN(value);

export const isBoolean = (value: unknown): value is boolean => 
  typeof value === 'boolean';

export const isObject = (value: unknown): value is Record<string, unknown> => 
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isArray = <T>(
  value: unknown,
  itemValidator?: (item: unknown) => item is T
): value is T[] => {
  if (!Array.isArray(value)) return false;
  if (!itemValidator) return true;
  return value.every(itemValidator);
};

// Store dev tools integration
export const createDevTools = (
  name: string,
  enabled = import.meta.env.DEV
) => {
  if (!enabled || typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
    return null;
  }
  
  return window.__REDUX_DEVTOOLS_EXTENSION__.connect({
    name,
    trace: true,
  });
};

// Global store registry for debugging
export const storeRegistry = new Map<string, unknown>();

export const registerStore = <T>(name: string, store: T): void => {
  if (import.meta.env.DEV) {
    storeRegistry.set(name, store);
    
    // Make stores globally accessible in development
    if (typeof window !== 'undefined') {
      window.__STORES__ = Object.fromEntries(storeRegistry);
    }
  }
};