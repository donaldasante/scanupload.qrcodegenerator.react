import type { Meta } from '@uppy/core';

/** Default Uppy `file.source` for files that originated from a ScanUpload session. */
export const SCAN_UPLOAD_SOURCE = 'ScanUpload';

/** Default plugin id, also the key used for `uppy.getPlugin(...)`. */
export const SCAN_UPLOAD_PLUGIN_ID = 'ScanUpload';

export function isAbortError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
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
