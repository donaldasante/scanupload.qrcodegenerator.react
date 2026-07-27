import { onMounted, onUnmounted, ref, watch, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorState, StorageAdapter } from '@scanupload/qr-code-generator-core';

export interface UseQrCodeCoreOptions {
    sessionUrl: MaybeRefOrGetter<string>;
    clientId?: MaybeRefOrGetter<string | undefined>;
    autoResession?: MaybeRefOrGetter<boolean>;
    storage?: StorageAdapter;
}

export function useQrCodeCore(options: UseQrCodeCoreOptions) {
    const core = new QrCodeGeneratorCore({
        sessionUrl: toValue(options.sessionUrl),
        clientId: toValue(options.clientId),
        autoResession: toValue(options.autoResession),
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
        () => [toValue(options.sessionUrl), toValue(options.clientId)] as const,
        ([sessionUrl, clientId]) => {
            void core.setOptions({ sessionUrl, clientId });
        }
    );

    onUnmounted(() => {
        unsubscribe?.();
        unsubscribe = null;
        core.dispose();
    });

    return {
        state,
        /** Underlying core instance — useful for components (e.g. `DownloadButton`) that need access to live state. */
        core,
        retrySession: () => core.retrySession(),
        setOptions: (opts: { sessionUrl?: string; clientId?: string }) => core.setOptions(opts)
    };
}
