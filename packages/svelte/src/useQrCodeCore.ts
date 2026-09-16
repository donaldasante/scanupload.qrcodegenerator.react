import { readable, type Readable } from 'svelte/store';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorState, ScanUploadFileOrigin, StorageAdapter, UploadedFile } from '@scanupload/qr-code-generator-core';

export interface UseQrCodeCoreOptions {
    sessionUrl: string;
    clientId?: string;
    autoResession?: boolean;
    storage?: StorageAdapter;
    /**
     * Bind to an existing core instead of creating one. The injected core is
     * owned by whoever supplied it — most commonly the ScanUpload Uppy plugin —
     * so this controller will neither start nor dispose it, and will not push
     * `sessionUrl` / `clientId` changes into it.
     */
    core?: QrCodeGeneratorCore | null;
    /**
     * Called for every file the hub is holding for this session, including
     * files that were already there when this client connected.
     *
     * `origin` is `'restored'` when the file was discovered during a reconnect
     * resync rather than pushed live, so you can avoid re-processing it.
     */
    onFileAvailable?: (file: UploadedFile, origin: ScanUploadFileOrigin) => void;
    /** Called when the hub drops a single file. Not called for a full clear. */
    onFileRemoved?: (file: UploadedFile) => void;
    /** Called when every file is cleared at once: a session reset, or the end of the session. */
    onFilesCleared?: (files: readonly UploadedFile[]) => void;
}

export interface QrCodeController {
    /** Reactive store with the latest core state. */
    state: Readable<QrCodeGeneratorState>;
    /** Underlying core instance — useful for components (e.g. `DownloadButton`) that need access to live state. */
    core: QrCodeGeneratorCore;
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
    const injected = options.core ?? null;
    const ownsCore = injected === null;

    const core =
        injected ??
        new QrCodeGeneratorCore({
            sessionUrl: options.sessionUrl,
            clientId: options.clientId,
            autoResession: options.autoResession,
            storage: options.storage
        });

    const state = readable<QrCodeGeneratorState>(core.getState(), (set) => {
        const unsubscribe = core.subscribe(() => set(core.getState()));
        const unsubscribes = [
            core.on('file-added', ({ file, origin }) => options.onFileAvailable?.(file, origin)),
            core.on('file-removed', ({ file }) => options.onFileRemoved?.(file)),
            core.on('files-cleared', ({ files }) => options.onFilesCleared?.(files))
        ];
        set(core.getState());
        if (ownsCore) void core.start();

        return () => {
            unsubscribe();
            for (const off of unsubscribes) off();
            if (ownsCore) core.dispose();
        };
    });

    return {
        state,
        /** Underlying core instance — useful for components (e.g. `DownloadButton`) that need access to live state. */
        core,
        retrySession: () => core.retrySession(),
        setOptions: (opts) => (ownsCore ? core.setOptions(opts) : Promise.resolve())
    };
}
