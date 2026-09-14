import type { Meta } from '@uppy/core';

/** Default Uppy `file.source` for files that originated from a ScanUpload session. */
export const SCAN_UPLOAD_SOURCE = 'ScanUpload';

/** Default plugin id, also the key used for `uppy.getPlugin(...)`. */
export const SCAN_UPLOAD_PLUGIN_ID = 'ScanUpload';

/**
 * Uppy plugin `type`.
 *
 * Deliberately **not** `'acquirer'` or `'editor'`: `@uppy/dashboard` auto-mounts
 * every plugin with one of those types that has no `target` option, and this
 * plugin is headless (it extends `BasePlugin`, which has no `mount()`). Using
 * either of those types makes the Dashboard throw `plugin.mount is not a
 * function` during `install()`. Uppy's own headless plugins follow the same
 * convention — `@uppy/thumbnail-generator` uses `'modifier'`, `@uppy/xhr-upload`
 * uses `'uploader'`.
 */
export const SCAN_UPLOAD_PLUGIN_TYPE = 'source';

export function isAbortError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

/** Default number of download attempts per file before reporting a failure. */
export const DEFAULT_MAX_DOWNLOAD_ATTEMPTS = 6;

/** Default delay before the first retry; doubles for each subsequent attempt. */
export const DEFAULT_DOWNLOAD_RETRY_DELAY_MS = 500;

/** Upper bound on a single backoff wait, so the schedule stays predictable. */
export const MAX_DOWNLOAD_RETRY_DELAY_MS = 4000;

/**
 * Backoff before the next attempt.
 *
 * With the defaults this is 500, 1000, 2000, 4000, 4000 ms — roughly 11.5 s of
 * patience in total. That window matters: the hub publishes a file's URL when it
 * emits `FileAdded`, which measurably precedes the blob becoming readable by up
 * to about a second, so a tight retry budget gives up on files the hub would
 * have served a moment later.
 */
export function backoffDelayMs(baseDelayMs: number, attempt: number): number {
    return Math.min(baseDelayMs * 2 ** (attempt - 1), MAX_DOWNLOAD_RETRY_DELAY_MS);
}

/**
 * HTTP statuses worth retrying.
 *
 * `404` is the important one: the hub can announce a file over SignalR a
 * moment before the blob is readable, so an immediate GET legitimately comes
 * back `FileUpload.FileNotFound`. `423`/`425` mean "not yet", `408`/`429` are
 * transient, and `5xx` may clear on its own. Anything else `4xx` (bad request,
 * auth, forbidden) is a configuration problem that retrying cannot fix.
 */
const RETRYABLE_HTTP_STATUSES = new Set([404, 408, 423, 425, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
    return RETRYABLE_HTTP_STATUSES.has(status);
}

function createAbortError(): Error {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
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

export function toError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string' && error.trim().length > 0) return new Error(error);
    return new Error(fallbackMessage);
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

/**
 * Wraps the downloaded blob in a `File` so Uppy keeps the original name and
 * MIME type. Falls back to the raw blob in environments without `File`.
 */
export function toBrowserFile(blob: Blob, name: string, type: string): Blob | File {
    if (typeof File === 'undefined') return blob;
    return new File([blob], name, { type });
}

/**
 * Uppy's meta generic (`M`) describes the shape of *the consumer's* Uppy
 * instance, which this plugin cannot know at compile time. At runtime Uppy
 * merely merges whatever object is supplied onto the file, so narrowing here
 * is safe — and it is the only place in the plugin that needs a cast.
 */
export function asUppyMeta<M extends Meta>(meta: Record<string, unknown>): M {
    return meta as unknown as M;
}
