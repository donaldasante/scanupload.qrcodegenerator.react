import { useEffect, useRef, useSyncExternalStore } from 'react';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCoreOptions, ScanUploadFileOrigin, UploadedFile } from '@scanupload/qr-code-generator-core';

export interface UseQrCodeCoreOptions extends QrCodeGeneratorCoreOptions {
    /**
     * Bind to an existing core instead of creating one. The injected core is
     * owned by whoever supplied it — most commonly the ScanUpload Uppy plugin —
     * so this hook will neither start nor dispose it, and will not push
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

    // Latest callbacks, kept reachable without re-subscribing — callers
    // routinely pass inline arrow functions, whose identity changes every render.
    const handlers = useRef<Pick<UseQrCodeCoreOptions, 'onFileAvailable' | 'onFileRemoved' | 'onFilesCleared'>>({});

    // Declared before the subscribe effect below, so on mount it has already
    // run by the time the listeners attach. With no dependency array it re-runs
    // after every render, so an event always sees the current callbacks.
    useEffect(() => {
        handlers.current = {
            onFileAvailable: options.onFileAvailable,
            onFileRemoved: options.onFileRemoved,
            onFilesCleared: options.onFilesCleared
        };
    });

    useEffect(() => {
        const offAdded = core.on('file-added', ({ file, origin }) => handlers.current.onFileAvailable?.(file, origin));
        const offRemoved = core.on('file-removed', ({ file }) => handlers.current.onFileRemoved?.(file));
        const offCleared = core.on('files-cleared', ({ files }) => handlers.current.onFilesCleared?.(files));

        return () => {
            offAdded();
            offRemoved();
            offCleared();
        };
    }, [core]);

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
