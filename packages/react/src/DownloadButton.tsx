import { useEffect, useRef, useState } from 'react';
import { triggerBrowserDownload } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCore, UploadedFile } from '@scanupload/qr-code-generator-core';

export interface DownloadButtonProps {
    /** Core instance returned by {@link useQrCodeCore}. */
    core: QrCodeGeneratorCore;
    /** Label for the button. Default: "Download all files". */
    label?: string;
    /** Custom className for the button. */
    className?: string;
}

/**
 * Renders a "Download all files" button that fetches every uploaded file
 * picked up by the SignalR hub (using the `url` each `UploadedFile` carries)
 * and triggers a browser save for each one.
 *
 * The component is disabled when no files have been received yet, and shows
 * a "Downloading..." state while the fetches are in flight. Per-file errors
 * are surfaced inline so a single bad URL doesn't abort the rest of the
 * batch.
 */
export function DownloadButton({
    core,
    label = 'Download all files',
    className
}: DownloadButtonProps) {
    const [fileCount, setFileCount] = useState(() => countDownloadable(core.getState().uploadedFiles));
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSnapshotRef = useRef<string>('');

    // Track the number of downloadable files reactively. The hub pushes new
    // `FileAdded` events via the core's `_setState`, so a subscription keeps
    // the count in sync without polling.
    useEffect(() => {
        const update = () => {
            const files = core.getState().uploadedFiles;
            const downloadable = countDownloadable(files);
            const snapshot = downloadableSnapshot(files);
            if (snapshot !== lastSnapshotRef.current) {
                lastSnapshotRef.current = snapshot;
                setFileCount(downloadable);
            }
        };
        update();
        return core.subscribe(update);
    }, [core]);

    // Auto-dismiss download errors after 5s.
    useEffect(() => {
        if (error) {
            errorTimerRef.current = setTimeout(() => setError(null), 5000);
            return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); };
        }
    }, [error]);

    const handleClick = async () => {
        setError(null);
        const files = core.getState().uploadedFiles.filter((f) => Boolean(f.url));
        if (files.length === 0) return;

        setDownloading(true);
        try {
            const results = await Promise.allSettled(
                files.map((file) => downloadFile(file))
            );

            const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
            if (failed.length > 0) {
                const firstReason = failed[0].reason;
                const message = firstReason instanceof Error
                    ? firstReason.message
                    : 'Some files failed to download.';
                setError(failed.length === files.length
                    ? `All downloads failed. ${message}`
                    : `${failed.length} of ${files.length} files failed. ${message}`);
            }
        } finally {
            setDownloading(false);
        }
    };

    const disabled = downloading || fileCount === 0;

    return (
        <div className="sqg-download">
            <button
                type="button"
                className={className ?? 'sqg-download-btn'}
                onClick={handleClick}
                disabled={disabled}
                aria-busy={downloading || undefined}
            >
                {downloading
                    ? 'Downloading…'
                    : fileCount > 0
                        ? `${label} (${fileCount})`
                        : label}
            </button>
            {error ? (
                <p className="sqg-download-error" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function countDownloadable(files: readonly UploadedFile[]): number {
    return files.reduce((n, f) => (f.url ? n + 1 : n), 0);
}

function downloadableSnapshot(files: readonly UploadedFile[]): string {
    return files.map((f) => `${f.id}:${f.url ?? ''}`).join('|');
}

async function downloadFile(file: UploadedFile): Promise<void> {
    if (!file.url) {
        throw new Error(`No download URL for "${file.name}".`);
    }

    let response: Response;
    try {
        response = await fetch(file.url, { credentials: 'include' });
    } catch (err) {
        throw new Error(`Network error downloading "${file.name}".`);
    }

    if (!response.ok) {
        throw new Error(`"${file.name}" download failed (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    triggerBrowserDownload(blob, file.name || deriveFilename(file.url));
}

function deriveFilename(url: string): string {
    try {
        const pathname = new URL(url, window.location.href).pathname;
        const last = pathname.split('/').filter(Boolean).pop();
        return last ?? 'download';
    } catch {
        return 'download';
    }
}
