import type { QrCodeGeneratorCore } from './QrCodeGeneratorCore';
import {
    MissingFileUrlError,
    ToFileBuilder,
    ToFileRetryInfo,
    UploadedFileUrlResolver,
    isAbortError,
    materializeFile,
    toError
} from './toFile';
import type { ScanUploadClearedEntry, ScanUploadFileOrigin, ScanUploadFileSink, ScanUploadFilesConnection, UploadedFile } from './types';

/**
 * Vendor-neutral fan-out from a ScanUpload session to any file-accepting target.
 *
 * This is the piece that lets every uploader integration be a thin adapter. It
 * owns the parts that are genuinely hard to get right — and identical for every
 * vendor:
 *
 *  - downloading each hub file into a real `File` (with retry, via {@link toFile})
 *  - de-duplicating replays, so a SignalR reconnect cannot upload twice
 *  - bounding concurrency so a 40-file session does not open 40 sockets
 *  - mirroring hub-side removals back into the target
 *  - aborting everything cleanly on teardown
 *
 * An adapter supplies only a {@link ScanUploadFileSink}: "given a file, put it
 * here". Nothing in this module knows about Uppy or any other uploader.
 */
export interface ConnectScanUploadFilesOptions<TTargetId = unknown> {
    /** The session runtime to observe. */
    core: QrCodeGeneratorCore;
    /** Where materialized files go. */
    sink: ScanUploadFileSink<TTargetId>;
    /** Overrides `UploadedFile.url` for relative/unsigned hub URLs. */
    resolveUrl?: UploadedFileUrlResolver;
    /** Extra `RequestInit` merged over `{ credentials: 'include' }`. */
    fetchOptions?: RequestInit;
    /** Replaces the default `new File(...)` construction. */
    buildFile?: ToFileBuilder;
    /**
     * Veto individual files. The second argument is the origin, so the common
     * case — "forward live files only, never replay a restored one" — is:
     *
     * ```ts
     * shouldForward: (_file, origin) => origin === 'live'
     * ```
     */
    shouldForward?: (file: UploadedFile, origin: ScanUploadFileOrigin) => boolean;
    /** Defaults to `true`. Set `false` to keep target files after a hub removal. */
    mirrorRemovals?: boolean;
    /** Max simultaneous downloads. Defaults to `4`. */
    maxConcurrentDownloads?: number;
    /** Download attempts per file. Defaults to `6`. */
    maxAttempts?: number;
    /** Base backoff delay in ms. Defaults to `500`. */
    retryDelayMs?: number;
    /** Called after the sink accepts a file. `targetId` is whatever `add` returned. */
    onForwarded?: (file: UploadedFile, targetId: TTargetId) => void;
    /** Called before each download retry. */
    onRetry?: (info: ToFileRetryInfo, file: UploadedFile) => void;
    /** Called when a file could not be handed over. Retry with `retryFailed()`. */
    onError?: (error: Error, file: UploadedFile) => void;
    /** Called after a removal was mirrored into the sink. */
    onRemoved?: (targetId: TTargetId, file: UploadedFile) => void;
    /** Called after everything was cleared. */
    onCleared?: (files: readonly UploadedFile[]) => void;
}

function normalizePositive(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) && (value as number) > 0 ? Math.floor(value as number) : fallback;
}

/**
 * Streams every file in a ScanUpload session into {@link ConnectScanUploadFilesOptions.sink}.
 *
 * Call it once per uploader instance and keep the returned handle:
 *
 * ```ts
 * const connection = connectScanUploadFiles({
 *     core,
 *     sink: {
 *         add: (file) => uppy.addFile({ name: file.name, type: file.type, data: file }),
 *         remove: (id) => uppy.removeFile(id),
 *     },
 * });
 *
 * // later
 * connection.disconnect();
 * ```
 */
export function connectScanUploadFiles<TTargetId = unknown>(
    options: ConnectScanUploadFilesOptions<TTargetId>
): ScanUploadFilesConnection<TTargetId> {
    const { core, sink } = options;
    const mirrorRemovals = options.mirrorRemovals !== false;
    const concurrency = normalizePositive(options.maxConcurrentDownloads, 4);

    const forwarded = new Map<string, TTargetId>();
    const queue = new Map<string, UploadedFile>();
    const downloading = new Map<string, AbortController>();
    const failed = new Map<string, UploadedFile>();
    /** Origin per file id, recorded from `file-added` so `shouldForward` can see it. */
    const origins = new Map<string, ScanUploadFileOrigin>();
    /** Files `shouldForward` rejected — never re-evaluated. */
    const skipped = new Set<string>();

    let disconnected = false;

    const isTracked = (scanFileId: string): boolean =>
        forwarded.has(scanFileId) ||
        queue.has(scanFileId) ||
        downloading.has(scanFileId) ||
        failed.has(scanFileId) ||
        skipped.has(scanFileId);

    /** Stops tracking a file, aborting its download if one is in flight. */
    const forget = (scanFileId: string): TTargetId | undefined => {
        downloading.get(scanFileId)?.abort();
        downloading.delete(scanFileId);
        queue.delete(scanFileId);
        failed.delete(scanFileId);
        origins.delete(scanFileId);
        skipped.delete(scanFileId);

        const targetId = forwarded.get(scanFileId);
        forwarded.delete(scanFileId);
        return targetId;
    };

    /** Removes and returns the oldest queued file (Map iterates in insertion order). */
    const takeQueued = (): [string, UploadedFile] | undefined => {
        const scanFileId = queue.keys().next().value as string | undefined;
        if (scanFileId === undefined) return undefined;

        const file = queue.get(scanFileId);
        if (!file) return undefined;

        queue.delete(scanFileId);
        return [scanFileId, file];
    };

    /**
     * Queues anything the hub is holding that is not already tracked.
     *
     * This runs on every state change rather than only on `file-added`, because
     * a file can be announced before its download URL exists. `toFile` rejects
     * such a file with {@link MissingFileUrlError}, and the next state change
     * (a progress tick is enough) queues it again.
     */
    const sweep = (): void => {
        if (disconnected) return;

        for (const file of core.getState().uploadedFiles) {
            if (isTracked(file.id)) continue;

            const origin = origins.get(file.id) ?? 'live';
            if (options.shouldForward && !options.shouldForward(file, origin)) {
                skipped.add(file.id);
                continue;
            }

            queue.set(file.id, file);
        }

        drain();
    };

    /** Starts downloads until the concurrency limit is reached. */
    const drain = (): void => {
        if (disconnected) return;

        while (downloading.size < concurrency) {
            const next = takeQueued();
            if (!next) return;
            // `run` registers its controller synchronously, so the loop
            // condition accounts for it on the next iteration.
            void run(next[0], next[1]);
        }
    };

    /**
     * Downloads one file and hands it to the sink. Never rejects — a single bad
     * file must not break the pool.
     */
    const run = async (scanFileId: string, file: UploadedFile): Promise<void> => {
        const controller = new AbortController();
        downloading.set(scanFileId, controller);

        try {
            if (disconnected) return;

            const { data, url } = await materializeFile(file, {
                resolveUrl: options.resolveUrl,
                fetchOptions: options.fetchOptions,
                buildFile: options.buildFile,
                signal: controller.signal,
                maxAttempts: options.maxAttempts,
                retryDelayMs: options.retryDelayMs,
                onRetry: options.onRetry
            });

            if (disconnected || controller.signal.aborted) return;

            const targetId = await sink.add(data, file, { url });
            forwarded.set(scanFileId, targetId);
            options.onForwarded?.(file, targetId);
        } catch (error) {
            if (disconnected || isAbortError(error) || controller.signal.aborted) return;

            // No URL yet is not a failure — `sweep` re-queues it on the next
            // state change, so leave the file untracked rather than failed.
            if (error instanceof MissingFileUrlError) return;

            const failure = toError(error, `Could not download "${file.name}" from ScanUpload.`);
            failed.set(scanFileId, file);
            options.onError?.(failure, file);
        } finally {
            if (downloading.get(scanFileId) === controller) {
                downloading.delete(scanFileId);
            }
            drain();
        }
    };

    /** Mirrors one hub-side removal into the sink. */
    const handleRemoved = (file: UploadedFile): void => {
        const targetId = forget(file.id);
        if (targetId === undefined || !mirrorRemovals || !sink.remove) return;

        try {
            void Promise.resolve(sink.remove(targetId, file)).catch(() => undefined);
            options.onRemoved?.(targetId, file);
        } catch {
            // A sink is allowed to refuse removal (e.g. Uppy blocks dropping a
            // file from an in-flight upload). The hub is still the source of
            // truth, so the target being out of step is not fatal here.
        }
    };

    /** Handles a full clear: session reset, or the session ending. */
    const handleCleared = (files: readonly UploadedFile[]): void => {
        // Built before any state is dropped, because it is the only record of
        // what the target itself called each file.
        const entries: ScanUploadClearedEntry<TTargetId>[] = [];
        for (const [scanFileId, targetId] of forwarded) {
            const source = files.find((file) => file.id === scanFileId);
            if (source) entries.push({ source, targetId });
        }

        for (const controller of downloading.values()) controller.abort();
        downloading.clear();
        queue.clear();
        failed.clear();
        origins.clear();
        skipped.clear();
        forwarded.clear();

        try {
            if (!mirrorRemovals || entries.length === 0) {
                // Nothing to mirror — the target keeps its own files.
            } else if (sink.clear) {
                void Promise.resolve(sink.clear(entries)).catch(() => undefined);
            } else if (sink.remove) {
                // No batch hook, so mirror the clear one file at a time.
                for (const entry of entries) {
                    void Promise.resolve(sink.remove(entry.targetId, entry.source)).catch(() => undefined);
                }
            }

            options.onCleared?.(files);
        } catch {
            // Same reasoning as `handleRemoved` — best effort.
        }
    };

    const unsubscribes = [
        core.on('file-added', ({ file, origin }) => {
            origins.set(file.id, origin);
            sweep();
        }),
        core.on('file-removed', ({ file }) => {
            handleRemoved(file);
        }),
        core.on('files-cleared', ({ files }) => {
            handleCleared(files);
        }),
        // Backstop for files announced before their URL existed.
        core.subscribe(sweep)
    ];

    // Pick up whatever the core already knows about — the caller may connect
    // after the session has been running for a while.
    sweep();

    return {
        forwarded,
        retryFailed(): void {
            if (disconnected) return;

            for (const [scanFileId, file] of failed) {
                failed.delete(scanFileId);
                queue.set(scanFileId, file);
            }

            drain();
        },
        disconnect(): void {
            if (disconnected) return;
            disconnected = true;

            for (const unsubscribe of unsubscribes) {
                if (typeof unsubscribe === 'function') unsubscribe();
            }

            for (const controller of downloading.values()) controller.abort();
            downloading.clear();
            queue.clear();
            failed.clear();
            origins.clear();
            skipped.clear();
            forwarded.clear();
        }
    };
}
