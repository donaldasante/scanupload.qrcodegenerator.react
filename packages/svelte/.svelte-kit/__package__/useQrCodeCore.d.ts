import { type Readable } from 'svelte/store';
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
    setOptions: (opts: {
        sessionUrl?: string;
        clientId?: string;
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
