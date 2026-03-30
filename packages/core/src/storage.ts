/**
 * Platform-agnostic storage abstraction.
 * Framework adapters supply an implementation (e.g. browser localStorage,
 * node fs-based store, or an in-memory stub for tests).
 */
export interface StorageAdapter {
    getItem<T = unknown>(key: string): T | undefined;
    setItem(key: string, value: unknown): void;
}

/**
 * Default browser localStorage adapter.
 * Works in any environment that exposes the Web Storage API.
 */
export const browserStorageAdapter: StorageAdapter = {
    getItem<T = unknown>(key: string): T | undefined {
        try {
            const item = localStorage.getItem(key);
            return item ? (JSON.parse(item) as T) : undefined;
        } catch (error) {
            console.error('Error reading from localStorage', error);
            return undefined;
        }
    },
    setItem(key: string, value: unknown): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error saving to localStorage', error);
        }
    }
};
