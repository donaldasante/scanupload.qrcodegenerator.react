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

/**
 * Returned by {@link QrCodeGeneratorCore.downloadSessionZip}. On success the
 * caller receives the binary blob plus a server-supplied filename (or a
 * caller-supplied default) and is expected to feed both to
 * {@link triggerBrowserDownload}. On failure the caller receives an error
 * message and an optional HTTP status — it should surface the message in its
 * own UI (the core never throws).
 */
export type DownloadSessionZipResult =
    | { ok: true; filename: string; blob: Blob }
    | { ok: false; error: string; status?: number };

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
     * downstream endpoints (e.g. the file-download ZIP stream) by session.
     */
    sessionId: string | null;
    /**
     * Mirror of the `downloadUrl` option passed to {@link QrCodeGeneratorCore}.
     * Surfaced on state so reactive UIs (React/Vue/Svelte/Angular) can read
     * whether a download endpoint is configured without having to thread
     * the option through. `null` when no download URL was configured.
     */
    downloadUrl: string | null;
}
