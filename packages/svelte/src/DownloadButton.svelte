<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { triggerBrowserDownload } from '@scanupload/qr-code-generator-core';
    import type { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';

    export let core: QrCodeGeneratorCore;
    export let label: string = 'Download';

    let downloading = false;
    let error: string | null = null;
    let canDownload = core.canDownloadZip();
    let unsubscribe: (() => void) | null = null;
    let errorTimer: ReturnType<typeof setTimeout> | null = null;

    function setError(msg: string | null) {
        error = msg;
        if (errorTimer) { clearTimeout(errorTimer); errorTimer = null; }
        if (msg) {
            errorTimer = setTimeout(() => { error = null; errorTimer = null; }, 5000);
        }
    }

    function refresh() {
        const next = core.canDownloadZip();
        // Clear stale errors when a new session becomes available.
        if (next && !canDownload) error = null;
        canDownload = next;
    }

    onMount(() => {
        refresh();
        unsubscribe = core.subscribe(refresh);
    });

    onDestroy(() => {
        unsubscribe?.();
        unsubscribe = null;
        if (errorTimer) clearTimeout(errorTimer);
    });

    async function handleClick() {
        setError(null);
        downloading = true;
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
            downloading = false;
        }
    }
</script>

<div class="sqg-download">
    <button
        type="button"
        class="sqg-download-btn"
        disabled={!canDownload || downloading}
        aria-busy={downloading || undefined}
        on:click={handleClick}
    >
        {downloading ? 'Downloading…' : label}
    </button>
    {#if error}
        <p class="sqg-download-error" role="alert">{error}</p>
    {/if}
</div>
