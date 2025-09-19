// Enhanced React hooks for the application

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useErrorHandler } from '@/components/ErrorBoundary';

// Custom hook for debounced values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for throttled callbacks
export function useThrottle<T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number
): (...args: T) => void {
  const throttledCallback = useRef(callback);
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    throttledCallback.current = callback;
  }, [callback]);

  return useCallback((...args: T) => {
    const now = Date.now();
    if (now - lastExecuted.current >= delay) {
      throttledCallback.current(...args);
      lastExecuted.current = now;
    }
  }, [delay]);
}

// Custom hook for async operations with loading states
export function useAsync<T, TError = Error>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [loading, setLoading] = useState<boolean>(immediate);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<TError | null>(null);
  const handleError = useErrorHandler();

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
      return result;
    } catch (err) {
      const error = err as TError;
      setError(error);
      handleError(err as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, handleError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    loading,
    data,
    error,
    execute,
    reset: useCallback(() => {
      setData(null);
      setError(null);
      setLoading(false);
    }, []),
  };
}

// Custom hook for local storage with type safety
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// Custom hook for previous value
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// Custom hook for window dimensions
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// Custom hook for intersection observer (for lazy loading)
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => setEntry(entries[0] || null),
      options
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, options]);

  return entry;
}

// Custom hook for keyboard shortcuts
export function useKeyboardShortcut(
  keys: string[],
  callback: (event: KeyboardEvent) => void,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { preventDefault = true, stopPropagation = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKeys: string[] = [];
      if (event.ctrlKey) pressedKeys.push('ctrl');
      if (event.metaKey) pressedKeys.push('meta');
      if (event.altKey) pressedKeys.push('alt');
      if (event.shiftKey) pressedKeys.push('shift');
      pressedKeys.push(event.key.toLowerCase());

      const isMatch = keys.every(key => 
        pressedKeys.includes(key.toLowerCase())
      ) && keys.length === pressedKeys.length;

      if (isMatch) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        callback(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keys, callback, preventDefault, stopPropagation, enabled]);
}

// Custom hook for clipboard operations
export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  return { copied, copy };
}

// Custom hook for online/offline status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);

    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);

    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  return isOnline;
}

// Custom hook for performance monitoring
export function usePerformanceMonitor(name: string, threshold = 100) {
  const startTime = useRef<number>();
  const endTime = useRef<number>();

  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const end = useCallback(() => {
    if (!startTime.current) return;
    
    endTime.current = performance.now();
    const duration = endTime.current - startTime.current;
    
    if (duration > threshold) {
      console.warn(`🐌 Slow operation "${name}": ${duration.toFixed(2)}ms`);
    }
    
    if (import.meta.env.DEV) {
      console.info(`⏱️ "${name}": ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }, [name, threshold]);

  const measure = useCallback(<T>(fn: () => T): T => {
    start();
    const result = fn();
    end();
    return result;
  }, [start, end]);

  const measureAsync = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    start();
    try {
      const result = await fn();
      end();
      return result;
    } catch (error) {
      end();
      throw error;
    }
  }, [start, end]);

  return { start, end, measure, measureAsync };
}

// Custom hook for safe async state updates
export function useSafeAsyncState<T>(
  initialState: T
): [T, (state: T | ((prevState: T) => T)) => void] {
  const [state, setState] = useState<T>(initialState);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    if (mountedRef.current) {
      setState(newState);
    }
  }, []);

  return [state, safeSetState];
}

// Custom hook for form validation
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: {
    [K in keyof T]?: (value: T[K]) => string | null;
  }
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validate = useCallback((field?: keyof T) => {
    const fieldsToValidate = field ? [field] : Object.keys(validationRules) as (keyof T)[];
    const newErrors: Partial<Record<keyof T, string>> = { ...errors };

    for (const fieldName of fieldsToValidate) {
      const rule = validationRules[fieldName];
      if (rule) {
        const error = rule(values[fieldName]);
        if (error) {
          newErrors[fieldName] = error;
        } else {
          delete newErrors[fieldName];
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, errors, validationRules]);

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    validate,
    reset,
  };
}