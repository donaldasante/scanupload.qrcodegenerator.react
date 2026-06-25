<script module lang="ts">
    export interface QrCodeGeneratorProps {
        sessionUrl: string;
        refreshTokenUrl: string;
        showHeader?: boolean;
        header?: string;
        showLogo?: boolean;
        clickQrCodeToReload?: boolean;
        filePreviewMode?: 'list' | 'grid';
        size?: 'small' | 'medium' | 'large' | 'xlarge';
    }
</script>

<script lang="ts">
    import { createQrCodeController } from './useQrCodeCore';
    import { generateQrSvg } from './qrcode';
    import { REDO_SVG } from './icons';
    import Logo from './components/Logo.svelte';
    import DocumentPreviewer from './components/DocumentPreviewer.svelte';
    import FileList from './components/FileList.svelte';

    let {
        sessionUrl,
        refreshTokenUrl,
        showHeader = false,
        header = '',
        showLogo = true,
        clickQrCodeToReload = false,
        filePreviewMode = 'grid',
        size = 'large'
    }: QrCodeGeneratorProps = $props();

    const controller = createQrCodeController({ sessionUrl, refreshTokenUrl });
    const coreState = controller.state;

    // Push runtime endpoint changes into the core, mirroring the React/Vue adapters.
    $effect(() => {
        void controller.setOptions({ sessionUrl, refreshTokenUrl });
    });

    // Regenerate the QR SVG whenever the device login URL changes.
    let qrSvg = $state('');
    $effect(() => {
        const url = $coreState.deviceLoginUrl || 'http://localhost';
        generateQrSvg(url, 200).then((svg) => (qrSvg = svg));
    });

    const onQrClick = async () => {
        if (clickQrCodeToReload) {
            await controller.retrySession();
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
    </div>
</section>
