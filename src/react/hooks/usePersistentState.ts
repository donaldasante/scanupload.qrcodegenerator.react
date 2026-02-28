import { useState, useEffect } from "react";
import { setItem, getItem } from "./localStorage";

export const usePersistentState = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    return getItem(key) ?? defaultValue;
  });

  useEffect(() => {
    setItem(key, value);
    setValue(value);
  }, [key, value]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) {
        setValue(e.newValue ? JSON.parse(e.newValue) : defaultValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key, defaultValue]);

  return [value, setValue] as const;
};
