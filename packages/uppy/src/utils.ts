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

// The download/retry helpers that used to live here — `isAbortError`, `delay`,
// `backoffDelayMs`, `isRetryableStatus` and the `DEFAULT_*_DOWNLOAD_*`
// constants — now live in `@scanupload/qr-code-generator-core` (`toFile.ts`),
// because every vendor adapter needs the same behaviour. See `materializeFile`.

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
 * Uppy's meta generic (`M`) describes the shape of *the consumer's* Uppy
 * instance, which this plugin cannot know at compile time. At runtime Uppy
 * merely merges whatever object is supplied onto the file, so narrowing here
 * is safe — and it is the only place in the plugin that needs a cast.
 */
export function asUppyMeta<M extends Meta>(meta: Record<string, unknown>): M {
    return meta as unknown as M;
}
