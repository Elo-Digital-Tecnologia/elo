// useLocalStorage hook — persistent state with SSR safety
import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use default
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue instanceof Function ? initialValue() : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : (initialValue instanceof Function ? initialValue() : initialValue);
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Update localStorage when state changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    if (typeof window === 'undefined') {
      console.warn(`Tried to set localStorage key "${key}" on server.`);
      return;
    }

    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      window.dispatchEvent(new StorageEvent('local-storage', { key, newValue: JSON.stringify(valueToStore) }));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange as EventListener);
    };
  }, [key]);

  return [storedValue, setValue];
}

// Specialized hooks
export function useLocalStorageBoolean(key: string, initialValue: boolean = false) {
  return useLocalStorage<boolean>(key, initialValue);
}

export function useLocalStorageString(key: string, initialValue: string = '') {
  return useLocalStorage<string>(key, initialValue);
}

export function useLocalStorageNumber(key: string, initialValue: number = 0) {
  return useLocalStorage<number>(key, initialValue);
}

export function useLocalStorageObject<T extends object>(key: string, initialValue: T) {
  return useLocalStorage<T>(key, initialValue);
}

export function useLocalStorageArray<T>(key: string, initialValue: T[] = []) {
  return useLocalStorage<T[]>(key, initialValue);
}