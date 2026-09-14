import type { Meta, PluginOpts } from '@uppy/core';
import type { QrCodeGeneratorState, StorageAdapter, UploadedFile } from '@scanupload/qr-code-generator-core';

/**
 * Metadata this plugin attaches to every Uppy file it creates.
 *
 * Consumers can widen their own meta interface by extending this one, which
 * keeps `uppy.addFile()` type-safe while still receiving the ScanUpload keys:
 *
 * ```ts
 * interface MyMeta extends ScanUploadFileMeta {
 *   projectId: string;
 * }
 * new Uppy<MyMeta, Body>({ meta: { projectId: 'abc' } });
 * ```
 */
export interface ScanUploadFileMeta {
    /** The `UploadedFile.id` the ScanUpload hub reported for this file. */
    scanUploadFileId: string;
    /** The ScanUpload session the file belongs to, when known. */
    scanUploadSessionId: string | null;
    /** The ScanUpload URL the file content was downloaded from. */
    scanUploadUrl: string;
}

/**
 * Resolves the download URL for a file reported by the hub. Use this when the
 * `UploadedFile.url` the hub pushes is not directly fetchable — for example
 * when you need to append a signed token, target a proxy, or synthesise a URL
 * from the session and file id.
 *
 * Return a falsy value to defer: the plugin will try again the next time the
 * core state changes (which is how files whose URL arrives in a later event
 * are picked up).
 */
export type ScanUploadUrlResolver = (
    file: UploadedFile,
    state: QrCodeGeneratorState
) => string | undefined | null | Promise<string | undefined | null>;

/**
 * Decides whether a file reported by the hub should be forwarded to Uppy.
 * Returning `false` permanently ignores that file. Default: forward every
 * file that has a resolvable URL.
 */
export type ScanUploadFileFilter = (file: UploadedFile, state: QrCodeGeneratorState) => boolean;

/**
 * Contributes additional Uppy metadata for a forwarded file. The keys returned
 * here are merged with — and can never override — the reserved
 * {@link ScanUploadFileMeta} keys.
 */
export type ScanUploadMetaBuilder<M extends Meta> = (file: UploadedFile, state: QrCodeGeneratorState) => M;

/**
 * Builds the value handed to Uppy as `file.data`. Defaults to a `File` created
 * from the downloaded blob so the original filename and MIME type survive.
 * Return a `Blob` to opt out of the `File` wrapper.
 */
export type ScanUploadFileBuilder = (blob: Blob, file: UploadedFile, state: QrCodeGeneratorState) => Blob | File;

export interface ScanUploadPluginOpts<M extends Meta = Meta> extends PluginOpts {
    /**
     * Endpoint that creates a ScanUpload session. The browser `POST`s here and
     * the hub authenticates the request from the `Origin` header.
     */
    sessionUrl: string;
    /**
     * Optional tenant / Keycloak `client_id`, sent in the session-create
     * request body so the hub can scope audit, rate-limits and per-client
     * rules.
     */
    clientId?: string;
    /**
     * Automatically replace the session when its TTL elapses. Default: `false`,
     * which surfaces the retry overlay in any ScanUpload UI bound to this
     * plugin's core.
     */
    autoResession?: boolean;
    /**
     * Storage adapter used to cache the session response. Defaults to the
     * browser `localStorage` adapter supplied by the core.
     */
    storage?: StorageAdapter;

    /**
     * Options forwarded to every `fetch()` of a ScanUpload file URL.
     *
     * Defaults to `{ credentials: 'include' }` so cookie-authenticated hubs
     * work out of the box. `signal` is managed by the plugin and cannot be
     * overridden.
     */
    fetchOptions?: Omit<RequestInit, 'signal'>;
    /** Override how a file's download URL is resolved. */
    resolveUrl?: ScanUploadUrlResolver;
    /** Filter which hub files are forwarded to Uppy. */
    shouldForward?: ScanUploadFileFilter;
    /** Add extra Uppy metadata to each forwarded file. */
    buildMeta?: ScanUploadMetaBuilder<M>;
    /** Override how the downloaded blob becomes Uppy's `file.data`. */
    buildFile?: ScanUploadFileBuilder;
    /** Uppy `file.source` value. Default: `'ScanUpload'`. */
    source?: string;

    /**
     * Remove the matching Uppy file when the hub reports a file removal (or
     * clears the session). Default: `true`, which keeps Uppy in step with the
     * ScanUpload view. Set to `false` to keep Uppy's own list untouched.
     *
     * Removals are best-effort: Uppy refuses to drop a file from an in-flight
     * upload if the installed uploader does not support individual cancellation,
     * and the plugin simply logs that case.
     */
    mirrorRemovals?: boolean;
    /** Maximum number of simultaneous file downloads. Default: `4`. */
    maxConcurrentDownloads?: number;

    /** Called after a file has been successfully added to Uppy. */
    onForwarded?: (file: UploadedFile, uppyFileId: string) => void;
    /**
     * Called when a file could not be downloaded or added. When omitted, the
     * error is logged and surfaced through Uppy's Informer.
     */
    onForwardError?: (error: Error, file: UploadedFile) => void;
}
