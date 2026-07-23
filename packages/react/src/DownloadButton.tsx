import { useEffect, useRef, useState } from 'react';
import { triggerBrowserDownload } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';

export interface DownloadButtonProps {
    /** Core instance returned by {@link useQrCodeCore}. */
    core: QrCodeGeneratorCore;
    /** Label for the button. Default: "Download". */
    label?: string;
    /** Custom className for the button. */
    className?: string;
}

/**
 * Renders a "Download" button that fetches the active session's uploaded-file
 * ZIP and triggers a browser save. Encapsulates `downloading` and
 * `downloadError` state so consumers don't have to wire that up themselves.
 *
 * The component disables itself whenever `core.canDownloadZip()` returns false
 * (no active session OR no `downloadUrl` configured).
 */
export function DownloadButton({
    core,
    label = 'Download',
    className
}: DownloadButtonProps) {
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canDownload, setCanDownload] = useState(() => core.canDownloadZip());
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track the enabled state reactively. The core fires `_setState` when
    // a session is acquired/cleared, so we subscribe via getSnapshot.
    const lastSnapshotRef = useRef<string>('');
    useEffect(() => {
        const update = () => {
            const state = core.getState();
            const snapshot = `${state.sessionId ?? ''}|${state.downloadUrl ?? ''}`;
            if (snapshot !== lastSnapshotRef.current) {
                lastSnapshotRef.current = snapshot;
                const next = core.canDownloadZip();
                // Clear stale errors when a new session becomes available.
                if (next && !canDownload) setError(null);
                setCanDownload(next);
            }
        };
        update();
        return core.subscribe(update);
    }, [core, canDownload]);

    // Auto-dismiss download errors after 5s.
    useEffect(() => {
        if (error) {
            errorTimerRef.current = setTimeout(() => setError(null), 5000);
            return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); };
        }
    }, [error]);

    const handleClick = async () => {
        setError(null);
        setDownloading(true);
        try {
            const result = await core.downloadSessionZip();
            if (result.ok) {
                triggerBrowserDownload(result.blob, result.filename);
            } else {
                setError(result.error);
            }
        } catch (err) {
            console.warn('DownloadButton error:', err);
            setError('Unexpected error — please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="sqg-download">
            <button
                type="button"
                className={className ?? 'sqg-download-btn'}
                onClick={handleClick}
                disabled={!canDownload || downloading}
                aria-busy={downloading || undefined}
            >
                {downloading ? 'Downloading…' : label}
            </button>
            {error ? (
                <p className="sqg-download-error" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
