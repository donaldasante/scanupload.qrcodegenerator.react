import { readable, type Readable } from 'svelte/store';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorState, StorageAdapter } from '@scanupload/qr-code-generator-core';

export interface UseQrCodeCoreOptions {
    sessionUrl: string;
    clientId?: string;
    storage?: StorageAdapter;
}

export interface QrCodeController {
    /** Reactive store with the latest core state. */
    state: Readable<QrCodeGeneratorState>;
    /** Tear down the current session and create a new one. */
    retrySession: () => Promise<void>;
    /** Update the API endpoint at runtime (mirrors the core `setOptions`). */
    setOptions: (opts: { sessionUrl?: string; clientId?: string }) => Promise<void>;
}

/**
 * Store-based controller that wraps {@link QrCodeGeneratorCore}, mirroring the
 * React `useQrCodeCore` hook and the Vue `useQrCodeCore` composable.
 *
 * The live session starts automatically when the `state` store gains its first
 * subscriber and is disposed when the last subscriber unsubscribes.
 */
export function createQrCodeController(options: UseQrCodeCoreOptions): QrCodeController {
    const core = new QrCodeGeneratorCore({
        sessionUrl: options.sessionUrl,
        clientId: options.clientId,
        storage: options.storage
    });

    const state = readable<QrCodeGeneratorState>(core.getState(), (set) => {
        const unsubscribe = core.subscribe(() => set(core.getState()));
        set(core.getState());
        void core.start();

        return () => {
            unsubscribe();
            core.dispose();
        };
    });

    return {
        state,
        retrySession: () => core.retrySession(),
        setOptions: (opts) => core.setOptions(opts)
    };
}
