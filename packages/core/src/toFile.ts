import type { UploadedFile } from './types';

/**
 * Browser-only helper that materializes a hub-held {@link UploadedFile} into a
 * real {@link File} you can hand to an uploader, a preview, or `FormData`.
 *
 * This lives in `core` (next to {@link triggerBrowserDownload}) because every
 * adapter needs the *same* download + retry behaviour. Keeping it here means
 * the Uppy plugin and any application-owned sink agree on how a transient
 * failure is handled.
 *
 * ## Why retries are not optional
 *
 * The hub publishes a file's URL when it emits `FileAdded`, and that signal
 * measurably precedes the blob becoming readable — by up to about a second.
 * An immediate `GET` therefore legitimately returns `404 FileUpload.FileNotFound`
 * for a file that is perfectly fine. Without a retry budget you lose those
 * files; the schedule below (500, 1000, 2000, 4000, 4000 ms ≈ 11.5 s) is tuned
 * to outlast that gap.
 */

/** Default number of download attempts per file before reporting a failure. */
export const DEFAULT_MAX_DOWNLOAD_ATTEMPTS = 6;

/** Default delay before the first retry; doubles for each subsequent attempt. */
export const DEFAULT_DOWNLOAD_RETRY_DELAY_MS = 500;

/** Upper bound on a single backoff wait, so the schedule stays predictable. */
export const MAX_DOWNLOAD_RETRY_DELAY_MS = 4000;

/**
 * HTTP statuses worth retrying.
 *
 * `404` is the important one: the hub can announce a file over SignalR a moment
 * before the blob is readable. `423`/`425` mean "not yet", `408`/`429` are
 * transient, and `5xx` may clear on its own. Anything else `4xx` (bad request,
 * auth, forbidden) is a configuration problem that retrying cannot fix.
 */
const RETRYABLE_HTTP_STATUSES = new Set([404, 408, 423, 425, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
    return RETRYABLE_HTTP_STATUSES.has(status);
}

/**
 * Backoff before the next attempt. Doubles per attempt, capped so a long
 * outage cannot turn into an unbounded wait.
 */
export function backoffDelayMs(baseDelayMs: number, attempt: number): number {
    return Math.min(baseDelayMs * 2 ** (attempt - 1), MAX_DOWNLOAD_RETRY_DELAY_MS);
}

function createAbortError(): Error {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
}

export function isAbortError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

export function toError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string' && error.trim().length > 0) return new Error(error);
    return new Error(fallbackMessage);
}

/** `setTimeout` that rejects with an abort error if `signal` fires first. */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }

        let timer: ReturnType<typeof setTimeout> | null = null;

        const onAbort = () => {
            if (timer !== null) clearTimeout(timer);
            reject(createAbortError());
        };

        timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);

        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

/** Last-resort filename when the hub supplies neither a name nor a usable URL. */
export function deriveFilename(url: string): string {
    try {
        const segments = new URL(url, 'http://localhost').pathname.split('/').filter(Boolean);
        const last = segments.pop();
        return last ? decodeURIComponent(last) : 'scanupload-file';
    } catch {
        return 'scanupload-file';
    }
}

/** Normalizes the name/type used for the materialized `File`. */
export function resolveFileIdentity(file: UploadedFile, url: string, blobType?: string): { name: string; type: string } {
    return {
        name: file.name?.trim() || deriveFilename(url),
        type: file.type?.trim() || blobType || 'application/octet-stream'
    };
}

/**
 * Raised when the hub is holding a file but has not published a download URL
 * for it yet. Callers should treat this as "try again later", not as a failure:
 * the URL usually appears on the next state change.
 */
export class MissingFileUrlError extends Error {
    readonly file: UploadedFile;

    constructor(file: UploadedFile) {
        super(`ScanUpload has not published a download URL for "${file.name}" yet.`);
        this.name = 'MissingFileUrlError';
        this.file = file;
    }
}

/** Reported before each retry, so callers can surface progress or give up early. */
export interface ToFileRetryInfo {
    /** Attempt that just failed (1-based). */
    attempt: number;
    maxAttempts: number;
    error: Error;
}

/**
 * Maps a hub file to a fetchable URL. Use this when `UploadedFile.url` is
 * relative, requires a signed query string, or must be proxied through your own
 * API. Return `null`/`undefined` to signal "not published yet".
 */
export type UploadedFileUrlResolver = (file: UploadedFile) => string | null | undefined | Promise<string | null | undefined>;

/** Builds the object handed to the sink. Return a `Blob` to skip `File` creation. */
export type ToFileBuilder = (blob: Blob, file: UploadedFile, url: string) => Blob | File;

export interface ToFileOptions {
    /** Overrides `UploadedFile.url` when the hub returns a relative or unsigned URL. */
    resolveUrl?: UploadedFileUrlResolver;
    /** Extra `RequestInit` merged over the defaults (`credentials: 'include'`). */
    fetchOptions?: RequestInit;
    /** Cancels in-flight downloads. */
    signal?: AbortSignal;
    /** Defaults to {@link DEFAULT_MAX_DOWNLOAD_ATTEMPTS}. */
    maxAttempts?: number;
    /** Defaults to {@link DEFAULT_DOWNLOAD_RETRY_DELAY_MS}. */
    retryDelayMs?: number;
    /** Called before each backoff wait. */
    onRetry?: (info: ToFileRetryInfo, file: UploadedFile) => void;
    /** Replaces the default `new File(...)` construction. */
    buildFile?: ToFileBuilder;
}

function normalizeMaxAttempts(value: number | undefined): number {
    const configured = value ?? DEFAULT_MAX_DOWNLOAD_ATTEMPTS;
    return Number.isFinite(configured) && configured > 0 ? Math.max(1, Math.floor(configured)) : DEFAULT_MAX_DOWNLOAD_ATTEMPTS;
}

function normalizeRetryDelay(value: number | undefined): number {
    const configured = value ?? DEFAULT_DOWNLOAD_RETRY_DELAY_MS;
    return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_DOWNLOAD_RETRY_DELAY_MS;
}

/**
 * A hub file downloaded into real content, with the URL it came from.
 *
 * The URL is carried alongside because a sink usually needs it: it is recorded
 * as Uppy metadata, and an uploader that supports remote ingestion can be handed
 * the URL instead of the bytes.
 */
export interface MaterializedFile {
    /** The downloaded content — a `File` unless `buildFile` returned a `Blob`. */
    data: File | Blob;
    /** The URL the content was fetched from, after `resolveUrl`. */
    url: string;
}

/**
 * Downloads a hub file and wraps it in a `File`, preserving the name and MIME
 * type the hub reported.
 *
 * Retries transient failures (see {@link isRetryableStatus}) on the backoff
 * schedule, and rejects with:
 *
 * - {@link MissingFileUrlError} — no URL published yet. Retry later.
 * - the abort error — `options.signal` fired. Stop tracking the file.
 * - the underlying error — attempts exhausted, or a non-retryable status
 *   (e.g. `403`). This is terminal; retrying will not help.
 */
export async function materializeFile(file: UploadedFile, options: ToFileOptions = {}): Promise<MaterializedFile> {
    const maxAttempts = normalizeMaxAttempts(options.maxAttempts);
    const retryDelayMs = normalizeRetryDelay(options.retryDelayMs);

    let lastError: Error = new Error(`Could not download "${file.name}" from ScanUpload.`);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const url = await resolveUrl(file, options.resolveUrl);
        if (!url) throw new MissingFileUrlError(file);

        const outcome = await attemptDownload(url, file, options);

        if (outcome.kind === 'ok') {
            if (options.buildFile) return { data: options.buildFile(outcome.blob, file, url), url };

            const identity = resolveFileIdentity(file, url, outcome.blob.type);
            return { data: new File([outcome.blob], identity.name, { type: identity.type }), url };
        }

        lastError = outcome.error;
        if (!outcome.retryable || attempt === maxAttempts) break;

        options.onRetry?.({ attempt, maxAttempts, error: lastError }, file);
        await delay(backoffDelayMs(retryDelayMs, attempt), options.signal);
    }

    throw lastError;
}

/** Result of a single download attempt. */
type AttemptOutcome = { kind: 'ok'; blob: Blob } | { kind: 'failed'; retryable: boolean; error: Error };

/**
 * One fetch attempt, classifying the failure so the caller decides whether to
 * retry. Aborts are thrown rather than returned — they mean "stop", not "retry".
 */
async function attemptDownload(url: string, file: UploadedFile, options: ToFileOptions): Promise<AttemptOutcome> {
    let response: Response;
    try {
        response = await fetch(url, {
            credentials: 'include',
            ...options.fetchOptions,
            signal: options.signal
        });
    } catch (error) {
        if (isAbortError(error)) throw error;
        return {
            kind: 'failed',
            // Network failures are always worth another go.
            retryable: true,
            error: toError(error, `Network error downloading "${file.name}".`)
        };
    }

    if (!response.ok) {
        // The URL is included because the usual cause of a failure here is a
        // hub-side URL pointing at the wrong host, route, or file id.
        return {
            kind: 'failed',
            retryable: isRetryableStatus(response.status),
            error: new Error(`The ScanUpload hub returned HTTP ${response.status} for "${file.name}" (${url}).`)
        };
    }

    try {
        return { kind: 'ok', blob: await response.blob() };
    } catch (error) {
        if (isAbortError(error)) throw error;
        return {
            kind: 'failed',
            retryable: true,
            error: toError(error, `Could not read the response body for "${file.name}".`)
        };
    }
}

/**
 * Convenience wrapper over {@link materializeFile} for the common case where you
 * only want the content.
 *
 * The cast is honest: `buildFile` is the only way to get a non-`File` back, and
 * callers who supply it know what they asked for.
 */
export async function toFile(file: UploadedFile, options: ToFileOptions = {}): Promise<File> {
    const { data } = await materializeFile(file, options);
    return data as File;
}

async function resolveUrl(file: UploadedFile, resolver: UploadedFileUrlResolver | undefined): Promise<string | undefined> {
    if (!resolver) return file.url || undefined;

    const resolved = await resolver(file);
    return resolved || undefined;
}
