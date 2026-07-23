import { type Readable } from 'svelte/store';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { DownloadSessionZipResult, QrCodeGeneratorState, StorageAdapter } from '@scanupload/qr-code-generator-core';
export interface UseQrCodeCoreOptions {
    sessionUrl: string;
    clientId?: string;
    downloadUrl?: string;
    storage?: StorageAdapter;
}
export interface QrCodeController {
    /** Reactive store with the latest core state. */
    state: Readable<QrCodeGeneratorState>;
    /** Underlying core instance — useful for components (e.g. `DownloadButton`) that need access to live methods. */
    core: QrCodeGeneratorCore;
    /** Tear down the current session and create a new one. */
    retrySession: () => Promise<void>;
    /** Triggers a fetch of the session ZIP. Returns a structured result; never throws. */
    downloadZip: () => Promise<DownloadSessionZipResult>;
    /** Whether a download can currently be triggered: session is active AND a downloadUrl is configured. */
    canDownloadZip: () => boolean;
    /** Update the API endpoint at runtime (mirrors the core `setOptions`). */
    setOptions: (opts: {
        sessionUrl?: string;
        clientId?: string;
        downloadUrl?: string;
    }) => Promise<void>;
}
/**
 * Store-based controller that wraps {@link QrCodeGeneratorCore}, mirroring the
 * React `useQrCodeCore` hook and the Vue `useQrCodeCore` composable.
 *
 * The live session starts automatically when the `state` store gains its first
 * subscriber and is disposed when the last subscriber unsubscribes.
 */
export declare function createQrCodeController(options: UseQrCodeCoreOptions): QrCodeController;
