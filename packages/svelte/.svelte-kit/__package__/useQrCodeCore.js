import { readable } from 'svelte/store';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
/**
 * Store-based controller that wraps {@link QrCodeGeneratorCore}, mirroring the
 * React `useQrCodeCore` hook and the Vue `useQrCodeCore` composable.
 *
 * The live session starts automatically when the `state` store gains its first
 * subscriber and is disposed when the last subscriber unsubscribes.
 */
export function createQrCodeController(options) {
    const core = new QrCodeGeneratorCore({
        sessionUrl: options.sessionUrl,
        clientId: options.clientId,
        downloadUrl: options.downloadUrl,
        storage: options.storage
    });
    const state = readable(core.getState(), (set) => {
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
        core,
        retrySession: () => core.retrySession(),
        downloadZip: () => core.downloadSessionZip(),
        canDownloadZip: () => core.canDownloadZip(),
        setOptions: (opts) => core.setOptions(opts)
    };
}
