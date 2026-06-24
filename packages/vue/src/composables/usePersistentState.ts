import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';
import { browserStorageAdapter } from '@scanupload/qr-code-generator-core';

export const usePersistentState = <T>(key: string, defaultValue: T): Ref<T> => {
    const value = ref<T>(browserStorageAdapter.getItem<T>(key) ?? defaultValue) as Ref<T>;

    watch(
        value,
        (newValue) => {
            browserStorageAdapter.setItem(key, newValue);
        },
        { deep: true }
    );

    const handler = (e: StorageEvent) => {
        if (e.key === key) {
            value.value = e.newValue ? (JSON.parse(e.newValue) as T) : defaultValue;
        }
    };

    onMounted(() => window.addEventListener('storage', handler));
    onUnmounted(() => window.removeEventListener('storage', handler));

    return value;
};
