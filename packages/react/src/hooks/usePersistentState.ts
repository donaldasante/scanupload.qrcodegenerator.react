import { useState, useEffect } from 'react';
import { browserStorageAdapter } from '@scanupload/qr-code-generator-core';

export const usePersistentState = <T>(key: string, defaultValue: T) => {
    const [value, setValue] = useState<T>(() => {
        return browserStorageAdapter.getItem<T>(key) ?? defaultValue;
    });

    useEffect(() => {
        browserStorageAdapter.setItem(key, value);
        setValue(value);
    }, [key, value]);

    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === key) {
                setValue(e.newValue ? JSON.parse(e.newValue) : defaultValue);
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [key, defaultValue]);

    return [value, setValue] as const;
};
