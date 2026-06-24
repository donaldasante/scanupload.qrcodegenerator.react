import { onMounted, onUnmounted, ref, watch, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorState, StorageAdapter } from '@scanupload/qr-code-generator-core';

export interface UseQrCodeCoreOptions {
    sessionUrl: MaybeRefOrGetter<string>;
    refreshTokenUrl: MaybeRefOrGetter<string>;
    storage?: StorageAdapter;
}

export function useQrCodeCore(options: UseQrCodeCoreOptions) {
    const core = new QrCodeGeneratorCore({
        sessionUrl: toValue(options.sessionUrl),
        refreshTokenUrl: toValue(options.refreshTokenUrl),
        storage: options.storage
    });

    const state = ref<QrCodeGeneratorState>(core.getState()) as Ref<QrCodeGeneratorState>;

    let unsubscribe: (() => void) | null = null;

    onMounted(() => {
        unsubscribe = core.subscribe(() => {
            state.value = core.getState();
        });
        core.start();
    });

    // React to runtime endpoint changes, mirroring the React hook's setOptions effect.
    watch(
        () => [toValue(options.sessionUrl), toValue(options.refreshTokenUrl)] as const,
        ([sessionUrl, refreshTokenUrl]) => {
            void core.setOptions({ sessionUrl, refreshTokenUrl });
        }
    );

    onUnmounted(() => {
        unsubscribe?.();
        unsubscribe = null;
        core.dispose();
    });

    return {
        state,
        retrySession: () => core.retrySession(),
        setOptions: (opts: { sessionUrl?: string; refreshTokenUrl?: string }) => core.setOptions(opts)
    };
}
