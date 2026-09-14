import { onMounted, onUnmounted, ref, watch, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorState, StorageAdapter } from '@scanupload/qr-code-generator-core';

export interface UseQrCodeCoreOptions {
    sessionUrl: MaybeRefOrGetter<string>;
    clientId?: MaybeRefOrGetter<string | undefined>;
    autoResession?: MaybeRefOrGetter<boolean>;
    storage?: StorageAdapter;
    /**
     * Bind to an existing core instead of creating one. The injected core is
     * owned by whoever supplied it — most commonly the ScanUpload Uppy plugin —
     * so this composable will neither start nor dispose it, and will not push
     * `sessionUrl` / `clientId` changes into it.
     */
    core?: QrCodeGeneratorCore | null;
}

export function useQrCodeCore(options: UseQrCodeCoreOptions) {
    const injected = options.core ?? null;
    const ownsCore = injected === null;

    const core =
        injected ??
        new QrCodeGeneratorCore({
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
        if (ownsCore) core.start();
    });

    // React to runtime endpoint changes, mirroring the React hook's setOptions effect.
    watch(
        () => [toValue(options.sessionUrl), toValue(options.clientId)] as const,
        ([sessionUrl, clientId]) => {
            if (!ownsCore) return;
            void core.setOptions({ sessionUrl, clientId });
        }
    );

    onUnmounted(() => {
        unsubscribe?.();
        unsubscribe = null;
        if (ownsCore) core.dispose();
    });

    return {
        state,
        /** Underlying core instance — useful for components (e.g. `DownloadButton`) that need access to live state. */
        core,
        retrySession: () => core.retrySession(),
        setOptions: (opts: { sessionUrl?: string; clientId?: string }) => core.setOptions(opts)
    };
}
