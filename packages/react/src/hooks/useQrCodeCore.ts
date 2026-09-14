import { useEffect, useRef, useSyncExternalStore } from 'react';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCoreOptions } from '@scanupload/qr-code-generator-core';

export interface UseQrCodeCoreOptions extends QrCodeGeneratorCoreOptions {
    /**
     * Bind to an existing core instead of creating one. The injected core is
     * owned by whoever supplied it — most commonly the ScanUpload Uppy plugin —
     * so this hook will neither start nor dispose it, and will not push
     * `sessionUrl` / `clientId` changes into it.
     */
    core?: QrCodeGeneratorCore | null;
}

export function useQrCodeCore(options: UseQrCodeCoreOptions) {
    // Read once, like the rest of the options: swapping the core mid-life would
    // orphan whichever core was previously bound.
    const injected = options.core ?? null;
    const ownsCore = injected === null;
    const coreRef = useRef<QrCodeGeneratorCore | null>(injected);

    // Instantiate once — stable across re-renders.
    coreRef.current ??= new QrCodeGeneratorCore(options);

    const core = coreRef.current;

    useEffect(() => {
        if (!ownsCore) return;
        core.start();
        return () => core.dispose();
    }, [core, ownsCore]);

    useEffect(() => {
        if (!ownsCore) return;
        void core.setOptions({
            sessionUrl: options.sessionUrl,
            clientId: options.clientId
        });
    }, [core, ownsCore, options.sessionUrl, options.clientId]);

    const state = useSyncExternalStore(
        (listener) => core.subscribe(listener),
        () => core.getState()
    );

    return {
        state,
        /** Underlying core instance — useful for components (e.g. `DownloadButton`) that need access to live state. */
        core,
        retrySession: () => core.retrySession()
    };
}
