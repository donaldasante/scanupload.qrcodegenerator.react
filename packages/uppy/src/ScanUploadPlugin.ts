import { BasePlugin } from '@uppy/core';
import type { Body, Meta, Uppy } from '@uppy/core';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorState, UploadedFile } from '@scanupload/qr-code-generator-core';
import type { ScanUploadPluginOpts } from './types';
import { SCAN_UPLOAD_PLUGIN_ID, SCAN_UPLOAD_SOURCE, asUppyMeta, deriveFilename, isAbortError, toBrowserFile, toError } from './utils';

/**
 * Uppy plugin that bridges a ScanUpload session into an Uppy instance.
 *
 * It drives a {@link QrCodeGeneratorCore} (the same runtime the ScanUpload
 * framework widgets use), waits for the hub to report files uploaded from a
 * phone, downloads each one, and hands it to Uppy with `uppy.addFile()`.
 * From that point on the file is an ordinary Uppy file: whichever uploader
 * plugin the application installed — XHR, Tus, S3 — sends it.
 *
 * ```ts
 * import Uppy from '@uppy/core';
 * import XHRUpload from '@uppy/xhr-upload';
 * import ScanUpload from '@scanupload/qr-code-generator-uppy';
 *
 * const uppy = new Uppy({ autoProceed: true })
 *   .use(ScanUpload, {
 *     sessionUrl: 'https://hub.example.com/api/v2/front-end/session',
 *     clientId: 'my-tenant',
 *   })
 *   .use(XHRUpload, { endpoint: '/api/uploads' });
 * ```
 *
 * The plugin owns the core it creates. Bind a ScanUpload UI to the *same*
 * session by handing the framework widget `plugin.getCore()`, otherwise the
 * widget will create a second session and show a different QR code.
 */
export class ScanUploadPlugin<M extends Meta = Meta, B extends Body = Record<string, never>> extends BasePlugin<
    ScanUploadPluginOpts<M>,
    M,
    B
> {
    /** Files waiting for a free download slot, in arrival order. */
    private readonly _queue = new Map<string, UploadedFile>();
    /** In-flight downloads, keyed by ScanUpload file id. */
    private readonly _downloading = new Map<string, AbortController>();
    /** ScanUpload file id -> Uppy file id, for files already handed to Uppy. */
    private readonly _forwarded = new Map<string, string>();
    /** ScanUpload file id -> terminal error, so failures are not retried on every state change. */
    private readonly _failed = new Map<string, Error>();

    private readonly _core: QrCodeGeneratorCore;
    private _unsubscribe: (() => void) | null = null;
    private _uninstalled = true;

    constructor(uppy: Uppy<M, B>, opts: ScanUploadPluginOpts<M>) {
        super(uppy, opts);

        // `BasePlugin` does not assign `id` itself, and it uses `id` as the key
        // in Uppy's `plugins` state slice — so it must be set first.
        this.id = opts.id ?? SCAN_UPLOAD_PLUGIN_ID;
        this.type = 'acquirer';

        // Constructing the core performs no I/O; `install()` starts it. Doing it
        // here means `getCore()` is never null, so UI can bind before `use()`.
        this._core = new QrCodeGeneratorCore({
            sessionUrl: opts.sessionUrl,
            clientId: opts.clientId,
            autoResession: opts.autoResession ?? false,
            storage: opts.storage
        });
    }

    // ── Uppy plugin lifecycle ────────────────────────────────────────────────

    override install(): void {
        this._uninstalled = false;
        this._unsubscribe = this._core.subscribe(() => this._sync());
        this._sync();
        void this._core.start();
        this.uppy.log(`[ScanUpload] Listening for files from ${this.opts.sessionUrl}.`);
    }

    override uninstall(): void {
        this._uninstalled = true;

        this._unsubscribe?.();
        this._unsubscribe = null;

        for (const controller of this._downloading.values()) controller.abort();
        this._downloading.clear();
        this._queue.clear();
        this._forwarded.clear();
        this._failed.clear();

        this._core.dispose();
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * The core this plugin drives. Pass it to a ScanUpload framework widget so
     * the QR code and this plugin share one session.
     */
    getCore(): QrCodeGeneratorCore {
        return this._core;
    }

    /** Latest ScanUpload session state (connection, countdown, uploaded files). */
    getState(): QrCodeGeneratorState {
        return this._core.getState();
    }

    /** Subscribe to ScanUpload state changes. Returns an unsubscribe function. */
    subscribe(listener: () => void): () => void {
        return this._core.subscribe(listener);
    }

    /** Tear down the current ScanUpload session and create a fresh one. */
    retrySession(): Promise<void> {
        return this._core.retrySession();
    }

    /** Uppy file id for a given ScanUpload file id, once it has been forwarded. */
    getUppyFileId(scanUploadFileId: string): string | undefined {
        return this._forwarded.get(scanUploadFileId);
    }

    /** Read-only view of the ScanUpload file id -> Uppy file id mapping. */
    getForwardedFiles(): ReadonlyMap<string, string> {
        return this._forwarded;
    }

    /**
     * Retry every file that previously failed to download or to be added.
     * Failures are not retried automatically, so that a permanently broken URL
     * does not re-fetch on every state change.
     */
    retryFailed(): void {
        if (this._uninstalled) return;
        this._failed.clear();
        this._sync();
    }

    // ── Reconciliation ───────────────────────────────────────────────────────

    /** Brings Uppy in line with the current ScanUpload state. */
    private _sync(): void {
        if (this._uninstalled) return;

        const state = this._core.getState();
        this._reconcileRemovals(state);

        for (const file of state.uploadedFiles) {
            if (this._isTracked(file.id)) continue;
            if (this.opts.shouldForward && !this.opts.shouldForward(file, state)) continue;
            this._queue.set(file.id, file);
        }

        this._drain();
    }

    /** Mirrors hub-side removals (including a session reset) into Uppy. */
    private _reconcileRemovals(state: QrCodeGeneratorState): void {
        if (this._forwarded.size === 0 && this._queue.size === 0 && this._downloading.size === 0 && this._failed.size === 0) {
            return;
        }

        const present = new Set(state.uploadedFiles.map((file) => file.id));
        const tracked = new Set<string>([
            ...this._forwarded.keys(),
            ...this._queue.keys(),
            ...this._downloading.keys(),
            ...this._failed.keys()
        ]);

        for (const scanFileId of tracked) {
            if (present.has(scanFileId)) continue;

            const uppyFileId = this._forget(scanFileId);
            if (!uppyFileId || this.opts.mirrorRemovals === false) continue;

            try {
                this.uppy.removeFile(uppyFileId);
                this.uppy.log(`[ScanUpload] Mirrored hub removal for Uppy file ${uppyFileId}.`);
            } catch (error) {
                // Uppy refuses to drop a file from an in-flight upload when the
                // installed uploader does not support individual cancellation.
                this.uppy.log(
                    `[ScanUpload] Could not remove Uppy file ${uppyFileId}: ${toError(error, 'unknown error').message}`,
                    'warning'
                );
            }
        }
    }

    /** Stops tracking a file, aborting its download if one is in flight. */
    private _forget(scanFileId: string): string | undefined {
        this._downloading.get(scanFileId)?.abort();
        this._downloading.delete(scanFileId);
        this._queue.delete(scanFileId);
        this._failed.delete(scanFileId);

        const uppyFileId = this._forwarded.get(scanFileId);
        this._forwarded.delete(scanFileId);
        return uppyFileId;
    }

    private _isTracked(scanFileId: string): boolean {
        return (
            this._forwarded.has(scanFileId) ||
            this._queue.has(scanFileId) ||
            this._downloading.has(scanFileId) ||
            this._failed.has(scanFileId)
        );
    }

    // ── Download pool ────────────────────────────────────────────────────────

    private get _downloadConcurrency(): number {
        const configured = this.opts.maxConcurrentDownloads ?? 4;
        return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 4;
    }

    /** Starts downloads until the concurrency limit is reached. */
    private _drain(): void {
        if (this._uninstalled) return;

        const limit = this._downloadConcurrency;
        while (this._downloading.size < limit) {
            const next = this._takeQueued();
            if (!next) return;
            // `_forward` registers its controller synchronously, so the loop
            // condition accounts for it on the next iteration.
            void this._forward(next[0], next[1]);
        }
    }

    private _takeQueued(): [string, UploadedFile] | undefined {
        for (const [scanFileId, file] of this._queue) {
            this._queue.delete(scanFileId);
            return [scanFileId, file];
        }
        return undefined;
    }

    /**
     * Downloads one hub file and adds it to Uppy. Never rejects — errors are
     * recorded and reported so a single bad file cannot break the pool.
     */
    private async _forward(scanFileId: string, file: UploadedFile): Promise<void> {
        const controller = new AbortController();
        this._downloading.set(scanFileId, controller);

        try {
            if (this._uninstalled) return;

            const state = this._core.getState();
            const url = await this._resolveUrl(file, state);
            if (!url) {
                // The hub has not published a download URL yet. Because the file
                // is no longer tracked, the next state change queues it again.
                return;
            }
            if (controller.signal.aborted || this._uninstalled) return;

            const response = await fetch(url, {
                credentials: 'include',
                ...this.opts.fetchOptions,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`The ScanUpload hub returned HTTP ${response.status} for "${file.name}".`);
            }

            const blob = await response.blob();
            if (controller.signal.aborted || this._uninstalled) return;

            this._addToUppy(file, blob, url, state);
        } catch (error) {
            if (isAbortError(error) || this._uninstalled) return;
            this._fail(file, toError(error, `Could not download "${file.name}" from ScanUpload.`));
        } finally {
            if (this._downloading.get(scanFileId) === controller) {
                this._downloading.delete(scanFileId);
            }
            this._drain();
        }
    }

    private async _resolveUrl(file: UploadedFile, state: QrCodeGeneratorState): Promise<string | undefined> {
        const resolver = this.opts.resolveUrl;
        if (!resolver) return file.url || undefined;

        try {
            const resolved = await resolver(file, state);
            return resolved || undefined;
        } catch (error) {
            this._fail(file, toError(error, `Could not resolve a URL for "${file.name}".`));
            return undefined;
        }
    }

    // ── Uppy hand-off ────────────────────────────────────────────────────────

    private _addToUppy(file: UploadedFile, blob: Blob, url: string, state: QrCodeGeneratorState): void {
        const name = file.name?.trim() || deriveFilename(url);
        const type = file.type?.trim() || blob.type || 'application/octet-stream';
        const data = this.opts.buildFile ? this.opts.buildFile(blob, file, state) : toBrowserFile(blob, name, type);

        // Reserved ScanUpload keys are applied last so a custom `buildMeta`
        // can never break the removal mapping.
        const meta = {
            ...(this.opts.buildMeta?.(file, state) ?? {}),
            scanUploadFileId: file.id,
            scanUploadSessionId: state.sessionId,
            scanUploadUrl: url
        };

        try {
            const uppyFileId = this.uppy.addFile({
                name,
                type,
                data,
                isRemote: false,
                source: this.opts.source ?? SCAN_UPLOAD_SOURCE,
                meta: asUppyMeta<M>(meta)
            });

            this._forwarded.set(file.id, uppyFileId);
            this.uppy.log(`[ScanUpload] Added "${name}" to Uppy as ${uppyFileId}.`);
            this.opts.onForwarded?.(file, uppyFileId);
        } catch (error) {
            // Thrown for restriction failures (size, type, count) and for
            // anything `onBeforeFileAdded` rejects.
            this._fail(file, toError(error, `Uppy refused "${name}".`));
        }
    }

    /** Records a terminal failure for a file and surfaces it to the user. */
    private _fail(file: UploadedFile, error: Error): void {
        this._failed.set(file.id, error);
        this.uppy.log(`[ScanUpload] ${error.message}`, 'error');

        if (this.opts.onForwardError) {
            this.opts.onForwardError(error, file);
            return;
        }

        this.uppy.info(
            {
                message: `ScanUpload could not hand over "${file.name}".`,
                details: error.message
            },
            'error'
        );
    }
}

export default ScanUploadPlugin;
