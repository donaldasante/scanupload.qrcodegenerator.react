/**
 * Response from `POST /api/v2/front-end/session`. The browser only sends
 * `Origin` (added automatically by the browser) — no auth header is required.
 * The returned `hubUrl` is the direct SignalR endpoint the client connects to;
 * `deviceLoginUrl` is the URL encoded into the QR code; `ttlSeconds` is the
 * lifetime of the session and drives the on-screen countdown.
 */
export interface SessionResponse {
    sessionId: string;
    deviceLoginUrl: string;
    hubUrl: string;
    ttlSeconds: number;
}

/**
 * @deprecated Token refresh is no longer performed. The client connects
 * directly to the SignalR hub and authenticates via the session response.
 * Retained so out-of-tree adapters that still reference the shape compile.
 */
export interface TokenResponse {
    access_token: string;
    expires_in: number;
}

export interface UploadedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    progress: number;
    status: 'added' | 'uploading' | 'success' | 'error';
    error?: string;
    url?: string;
    thumbnailBase64?: string;
}

export interface QrCodeGeneratorState {
    loading: boolean;
    isConnected: boolean;
    retry: boolean;
    deviceLoginUrl: string;
    uploadedFiles: UploadedFile[];
    /**
     * Absolute expiry timestamp (ms since epoch) of the current session.
     * `null` until the first session is fetched, or after the session ends.
     */
    expiresAt: number | null;
    /**
     * Live countdown remaining on the current session, in whole seconds.
     * The core ticks this down once per second starting from the
     * `ttlSeconds` returned by the session endpoint. `null` until the first
     * session is fetched, or after it ends / the timer hits zero.
     */
    secondsRemaining: number | null;
    /**
     * Last HTTP status received while creating a session. Common values:
     *  - `409` when the tenant reached `MaxActiveSessionsPerTenant`
     *  - `429` when the public create-session rate limit is exceeded
     *  - `null` when no error has occurred (or the error was not HTTP-shaped)
     */
    errorCode: number | null;
    /**
     * The active session id. `null` until the first session is fetched, or
     * after the session ends. Useful for clients that need to address
     * downstream endpoints by session.
     */
    sessionId: string | null;
}

// ── File lifecycle events ───────────────────────────────────────────────────

/**
 * How a file entered this client.
 *
 * - `live` — the hub pushed it over SignalR while this client was watching.
 * - `restored` — it was discovered while re-syncing a session (a reconnect, or
 *   the first sweep after connecting). Consumers that forward files to an
 *   uploader usually want to ignore these, so a reconnect does not re-upload
 *   everything the session already holds.
 */
export type ScanUploadFileOrigin = 'live' | 'restored';

/**
 * Payloads for the file lifecycle events emitted by `QrCodeGeneratorCore`.
 *
 * The contract is deliberately unambiguous, so a listener never has to
 * disambiguate between two signals for one occurrence:
 *
 * - `file-removed` fires only for an individual removal, and only when other
 *   files remain.
 * - `files-cleared` fires only when the list empties (a session reset, or the
 *   session ending) — never alongside `file-removed` events for the same files.
 */
export interface ScanUploadEventMap {
    /** A file the hub is holding for this session. */
    'file-added': { file: UploadedFile; origin: ScanUploadFileOrigin };
    /** A file the hub no longer holds — removed on the phone, or by another client. */
    'file-removed': { file: UploadedFile };
    /** Every file was cleared at once. `files` is the pre-clear list. */
    'files-cleared': { files: readonly UploadedFile[] };
}

export type ScanUploadEventName = keyof ScanUploadEventMap;

export type ScanUploadEventListener<K extends ScanUploadEventName> = (event: ScanUploadEventMap[K]) => void;

/** Removes the listener it was returned from. */
export type ScanUploadUnsubscribe = () => void;

// ── Uploader-agnostic fan-out ───────────────────────────────────────────────

/**
 * Extra context handed to a sink alongside each file.
 *
 * The URL matters to real adapters: `@uppy/*` records it as metadata, and an
 * uploader that supports remote ingestion can forward it instead of accepting
 * the bytes a second time.
 */
export interface ScanUploadFileContext {
    /** The URL the content was downloaded from, after `resolveUrl`. */
    url: string;
}

/**
 * One entry in a batch clear: the hub file and the target's id for it.
 *
 * The pairing is supplied because `connectScanUploadFiles` has already dropped
 * its own records by the time `clear` runs — without it, a sink would have to
 * keep a parallel map just to know what to remove.
 */
export interface ScanUploadClearedEntry<TTargetId = unknown> {
    source: UploadedFile;
    targetId: TTargetId;
}

/**
 * Anything that can accept a materialized file: an uploader engine, a widget's
 * selected-files array, or your own list.
 *
 * `add` must be idempotent per ScanUpload file id — a reconnect can replay a
 * file, and `connectScanUploadFiles` suppresses duplicates before calling the
 * sink.
 */
export interface ScanUploadFileSink<TTargetId = unknown> {
    /**
     * Hands a downloaded file to the target. Return a target id to allow removal.
     *
     * `data` is a `File` unless a custom `buildFile` returned a `Blob`.
     */
    add(data: File | Blob, source: UploadedFile, context: ScanUploadFileContext): Promise<TTargetId> | TTargetId;
    /** Mirrors a hub-side removal. Optional: omit if the target never removes. */
    remove?(targetId: TTargetId, source: UploadedFile): Promise<void> | void;
    /**
     * Called when every file is cleared at once (a session reset, or the session
     * ending). When omitted, the bridge falls back to `remove` per entry.
     */
    clear?(entries: readonly ScanUploadClearedEntry<TTargetId>[]): Promise<void> | void;
}

/** Handle returned by `connectScanUploadFiles`. */
export interface ScanUploadFilesConnection<TTargetId = unknown> {
    /** ScanUpload file id -> id assigned by the sink. */
    readonly forwarded: ReadonlyMap<string, TTargetId>;
    /** Re-attempts files that previously failed. */
    retryFailed(): void;
    /** Stops listening, aborts in-flight downloads, and forgets all state. */
    disconnect(): void;
}
