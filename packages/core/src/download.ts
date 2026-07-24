/**
 * Browser-only helper that turns a {@link Blob} into a file save without
 * navigating the page. Used by framework adapters (e.g. the React
 * `<DownloadButton>`) so every framework can share a single implementation
 * of the same DOM dance.
 *
 * Safari in particular needs a non-zero delay between `click()` and
 * `URL.revokeObjectURL()` — we defer the revocation onto the next tick.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Defer revocation so Safari/older browsers have a chance to honor
    // the click and begin the download — an immediate revoke can race
    // against the user-agent's download-init logic.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
