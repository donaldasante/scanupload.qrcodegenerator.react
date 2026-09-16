import { onMounted, onUnmounted, ref, watch, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorState, ScanUploadFileOrigin, StorageAdapter, UploadedFile } from '@scanupload/qr-code-generator-core';

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
    const unsubscribes: Array<() => void> = [];

    onMounted(() => {
        unsubscribe = core.subscribe(() => {
            state.value = core.getState();
        });
        unsubscribes.push(
            core.on('file-added', ({ file, origin }) => options.onFileAvailable?.(file, origin)),
            core.on('file-removed', ({ file }) => options.onFileRemoved?.(file)),
            core.on('files-cleared', ({ files }) => options.onFilesCleared?.(files))
        );
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
        for (const off of unsubscribes) off();
        unsubscribes.length = 0;
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
