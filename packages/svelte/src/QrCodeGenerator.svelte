<script module lang="ts">
    export interface QrCodeGeneratorProps {
        sessionUrl: string;
        /**
         * Optional client identifier (tenant / app GUID). Forwarded to the
         * session-create endpoint as `X-Client-Id` so the hub can scope
         * audit, rate-limits, and per-client rules.
         */
        clientId?: string;
        showHeader?: boolean;
        header?: string;
        showLogo?: boolean;
        clickQrCodeToReload?: boolean;
        filePreviewMode?: 'list' | 'grid';
        size?: 'small' | 'medium' | 'large' | 'xlarge';
        /**
         * Show a "Download all files" button beneath the file previews. When
         * clicked, it fetches every `UploadedFile.url` the SignalR hub has
         * surfaced and triggers a browser save for each. Default: false.
         */
        showDownloadButton?: boolean;
    }
</script>

<script lang="ts">
    import { createQrCodeController } from './useQrCodeCore';
    import { generateQrSvg } from './qrcode';
    import { REDO_SVG } from './icons';
    import Logo from './components/Logo.svelte';
    import DocumentPreviewer from './components/DocumentPreviewer.svelte';
    import FileList from './components/FileList.svelte';
    import DownloadButton from './DownloadButton.svelte';

    let {
        sessionUrl,
        clientId,
        showHeader = false,
        header = '',
        showLogo = true,
        clickQrCodeToReload = false,
        filePreviewMode = 'grid',
        size = 'large',
        showDownloadButton = false
    }: QrCodeGeneratorProps = $props();

    const controller = createQrCodeController({ sessionUrl, clientId });
    const coreState = controller.state;

    // Push runtime endpoint changes into the core, mirroring the React/Vue adapters.
    $effect(() => {
        void controller.setOptions({ sessionUrl, clientId });
    });

    // Regenerate the QR SVG whenever the device login URL changes.
    let qrSvg = $state('');
    $effect(() => {
        const url = $coreState.deviceLoginUrl || 'http://localhost';
        generateQrSvg(url, 200).then((svg) => (qrSvg = svg));
    });

    const onQrClick = () => {
        if (clickQrCodeToReload) {
            void controller.retrySession();
        }
    };
</script>

<section class="sqg-root" data-size={size}>
    {#if $coreState.loading}
        <div class="sqg-overlay">
            <div class="sqg-loading-content">
                <div class="sqg-spinner"></div>
                <p class="sqg-loading-text">Loading...</p>
            </div>
        </div>
    {/if}
    {#if !$coreState.loading && $coreState.retry}
        <div class="sqg-overlay">
            <div class="sqg-error-content">
                <p class="sqg-error-text">Cannot create session</p>
                <button class="sqg-retry-btn" onclick={() => controller.retrySession()}>{@html REDO_SVG}</button>
            </div>
        </div>
    {/if}
    <div class="sqg-content">
        {#if showHeader}
            <header class="sqg-header">
                <h1 class="sqg-header-title">{header}</h1>
            </header>
        {/if}
        <div
            aria-label="QR Code for file upload"
            class="sqg-qr-wrapper"
            style={clickQrCodeToReload ? 'cursor: pointer' : undefined}
            onclick={onQrClick}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
                if (clickQrCodeToReload && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    void controller.retrySession();
                }
            }}
        >
            <div class="sqg-qr-inner">
                <div class="sqg-qr-svg">{@html qrSvg}</div>
                {#if showLogo}
                    <div class="sqg-logo-overlay">
                        <Logo isConnected={$coreState.isConnected} />
                    </div>
                {/if}
            </div>
            <p class="sqg-sr-only">QR Code that allows uploads from {$coreState.deviceLoginUrl}</p>
        </div>
        {#if !clickQrCodeToReload}
            <div class="sqg-reload-section">
                <button class="sqg-reload-btn" onclick={() => controller.retrySession()}>
                    {@html REDO_SVG} <span>Reload</span>
                </button>
            </div>
        {:else}
            <div class="sqg-reload-section">
                <p class="sqg-hint-text">Click QR code to reload</p>
            </div>
        {/if}
        <div class="sqg-file-container">
            {#if filePreviewMode === 'grid'}
                {#each $coreState.uploadedFiles as file (file.id)}
                    <DocumentPreviewer {file} />
                {/each}
            {:else}
                <FileList files={$coreState.uploadedFiles} />
            {/if}
        </div>
        {#if showDownloadButton}
            <DownloadButton core={controller.core} />
        {/if}
    </div>
</section>
