import { BasePlugin } from '@uppy/core';
import type { Body, Meta, Uppy } from '@uppy/core';
import { QrCodeGeneratorCore, connectScanUploadFiles } from '@scanupload/qr-code-generator-core';
import type {
    QrCodeGeneratorState,
    ScanUploadClearedEntry,
    ScanUploadFileContext,
    ScanUploadFileSink,
    ScanUploadFilesConnection,
    UploadedFile
} from '@scanupload/qr-code-generator-core';
import type { ScanUploadPluginOpts } from './types';
import { SCAN_UPLOAD_PLUGIN_ID, SCAN_UPLOAD_PLUGIN_TYPE, SCAN_UPLOAD_SOURCE, asUppyMeta, deriveFilename, toError } from './utils';

/** Stable empty map, so `getForwardedFiles()` has something to return after teardown. */
const NO_FILES: ReadonlyMap<string, string> = new Map();

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
    private readonly _core: QrCodeGeneratorCore;
    /**
     * All of the hard parts — downloading, retry, de-duplication, concurrency
     * and removal mirroring — live in the core's `connectScanUploadFiles`.
     * What remains here is the Uppy-specific half: a sink, and a mapping from
     * these plugin options onto the bridge's.
     */
    private _connection: ScanUploadFilesConnection<string> | null = null;
    private _uninstalled = true;

    constructor(uppy: Uppy<M, B>, opts: ScanUploadPluginOpts<M>) {
        super(uppy, opts);

        // `BasePlugin` does not assign `id` itself, and it uses `id` as the key
        // in Uppy's `plugins` state slice — so it must be set first.
        this.id = opts.id ?? SCAN_UPLOAD_PLUGIN_ID;
        // See `SCAN_UPLOAD_PLUGIN_TYPE`: this must stay out of the types
        // `@uppy/dashboard` auto-mounts, because this plugin has no UI.
        this.type = SCAN_UPLOAD_PLUGIN_TYPE;

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

        this._connection = connectScanUploadFiles<string>({
            core: this._core,
            sink: this._createSink(),
            // The public filter/resolver signatures take the whole session
            // state, so they are adapted here rather than changed.
            shouldForward: (file) => (this.opts.shouldForward ? this.opts.shouldForward(file, this._core.getState()) : true),
            resolveUrl: (file) => this._resolveUrl(file),
            buildFile: this.opts.buildFile ? (blob, file) => this.opts.buildFile!(blob, file, this._core.getState()) : undefined,
            fetchOptions: this.opts.fetchOptions,
            mirrorRemovals: this.opts.mirrorRemovals,
            maxConcurrentDownloads: this.opts.maxConcurrentDownloads,
            maxAttempts: this.opts.maxDownloadAttempts,
            retryDelayMs: this.opts.downloadRetryDelayMs,
            onRetry: this.opts.onDownloadRetry,
            onForwarded: (file, uppyFileId) => {
                this.uppy.log(`[ScanUpload] Added "${file.name}" to Uppy as ${uppyFileId}.`);
                this.opts.onForwarded?.(file, uppyFileId);
            },
            onError: (error, file) => this._fail(file, error),
            onRemoved: (uppyFileId) => this.uppy.log(`[ScanUpload] Mirrored hub removal for Uppy file ${uppyFileId}.`)
        });

        void this._core.start();
        this.uppy.log(`[ScanUpload] Listening for files from ${this.opts.sessionUrl}.`);
    }

    override uninstall(): void {
        this._uninstalled = true;
        // Aborts in-flight downloads and drops every listener the bridge holds.
        this._connection?.disconnect();
        this._connection = null;
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
        return this._connection?.forwarded.get(scanUploadFileId);
    }

    /** Read-only view of the ScanUpload file id -> Uppy file id mapping. */
    getForwardedFiles(): ReadonlyMap<string, string> {
        return this._connection?.forwarded ?? NO_FILES;
    }

    /**
     * Retry every file that previously failed to download or to be added.
     * Failures are not retried automatically, so that a permanently broken URL
     * does not re-fetch on every state change.
     */
    retryFailed(): void {
        if (this._uninstalled) return;
        this._connection?.retryFailed();
    }

    // ── Uppy sink ────────────────────────────────────────────────────────────

    /**
     * The Uppy-specific half of the bridge: how a materialized file becomes an
     * Uppy file, and how a hub-side removal is undone.
     */
    private _createSink(): ScanUploadFileSink<string> {
        return {
            add: (data, source, context) => this._addToUppy(data, source, context),
            remove: (uppyFileId, source) => this._removeFromUppy(uppyFileId, source),
            clear: (entries) => this._clearFromUppy(entries)
        };
    }

    /**
     * Resolves a file's download URL.
     *
     * This keeps the public `(file, state)` resolver signature even though the
     * bridge only supplies the file. Resolver errors are deliberately not
     * caught here — they propagate out of the download and land in `onError`,
     * which is the same place they were reported before.
     */
    private _resolveUrl(file: UploadedFile) {
        if (!this.opts.resolveUrl) return file.url || undefined;

        return this.opts.resolveUrl(file, this._core.getState());
    }

    // ── Uppy hand-off ────────────────────────────────────────────────────────

    private _addToUppy(data: File | Blob, file: UploadedFile, context: ScanUploadFileContext): string {
        const state = this._core.getState();
        const name = file.name?.trim() || deriveFilename(context.url);
        const type = file.type?.trim() || data.type || 'application/octet-stream';

        // Reserved ScanUpload keys are applied last so a custom `buildMeta`
        // can never break the removal mapping. Spreading `undefined` is a no-op,
        // which covers a `buildMeta` that returns nothing.
        const meta = {
            ...this.opts.buildMeta?.(file, state),
            scanUploadFileId: file.id,
            scanUploadSessionId: state.sessionId,
            scanUploadUrl: context.url
        };

        try {
            return this.uppy.addFile({
                name,
                type,
                data,
                isRemote: false,
                source: this.opts.source ?? SCAN_UPLOAD_SOURCE,
                meta: asUppyMeta<M>(meta)
            });
        } catch (error) {
            // Thrown for restriction failures (size, type, count) and for
            // anything `onBeforeFileAdded` rejects. Rethrowing hands the failure
            // to the bridge, which records it so `retryFailed()` can try again.
            throw toError(error, `Uppy refused "${name}".`);
        }
    }

    /** Mirrors one hub-side removal into Uppy. */
    private _removeFromUppy(uppyFileId: string, source: UploadedFile): void {
        try {
            this.uppy.removeFile(uppyFileId);
        } catch (error) {
            // Uppy refuses to drop a file from an in-flight upload when the
            // installed uploader does not support individual cancellation.
            this.uppy.log(
                `[ScanUpload] Could not remove Uppy file ${uppyFileId} ("${source.name}"): ${toError(error, 'unknown error').message}`,
                'warning'
            );
        }
    }

    /** Mirrors a session-wide clear into Uppy, file by file. */
    private _clearFromUppy(entries: readonly ScanUploadClearedEntry<string>[]): void {
        for (const entry of entries) {
            this._removeFromUppy(entry.targetId, entry.source);
        }
    }

    /** Records a terminal failure for a file and surfaces it to the user. */
    private _fail(file: UploadedFile, error: Error): void {
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
