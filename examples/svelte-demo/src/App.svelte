<script lang="ts">
    import { onDestroy } from 'svelte';
    import Uppy from '@uppy/core';
    import Dashboard from '@uppy/dashboard';
    import XHRUpload from '@uppy/xhr-upload';
    import ScanUploadPlugin from '@scanupload/qr-code-generator-uppy';
    import { QrCodeGenerator } from '@scanupload/qr-code-generator-svelte';
    import type { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';

    // Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
    function requiredEnv(value: string | undefined, name: string): string {
        if (!value) {
            throw new Error(`${name} is not set. Copy .env.example to .env.local or provide it as a Docker build argument.`);
        }
        return value;
    }

    const sessionUrl = requiredEnv(import.meta.env.VITE_SESSION_URL, 'VITE_SESSION_URL');
    const clientId = requiredEnv(import.meta.env.VITE_CLIENT_ID, 'VITE_CLIENT_ID');
    /** Where Uppy sends files. Defaults to the mock endpoint in `vite.config.js`. */
    const uploadEndpoint = import.meta.env.VITE_UPLOAD_ENDPOINT || '/demo-upload';

    // ── Widget controls ─────────────────────────────────────────────────────

    let showQrCodeLogo = $state(true);
    let clickQrcodeReload = $state(true);
    let showHeader = $state(true);
    /**
     * Off by default: the button operates on the widget's file list, which is
     * only rendered when `showFilePreviews` is on. With previews off there is
     * nothing for it to act on, so it would sit there disabled.
     */
    let showDownloadButton = $state(false);
    /**
     * Off by default: Uppy renders everything the phone sends, so the widget's
     * own list would show the same files twice. Turn it on to exercise the
     * widget's preview list (and the two controls above it) instead.
     */
    let showFilePreviews = $state(false);
    let filePreviewMode = $state<'list' | 'grid'>('list');
    let headerText = $state('Scan to upload');
    let qrCodeSize = $state<'small' | 'medium' | 'large' | 'xlarge'>('large');

    const sizeOptions = [
        { value: 'small' as const, label: 'Small' },
        { value: 'medium' as const, label: 'Medium' },
        { value: 'large' as const, label: 'Large' },
        { value: 'xlarge' as const, label: 'X-Large' }
    ];

    // ── Uppy + ScanUpload wiring ────────────────────────────────────────────
    //
    // The plugin owns the ScanUpload session and hands every file the phone
    // sends to Uppy. The widget below renders the QR code for that same core,
    // so both halves feed one Uppy instance and upload to the same place.
    let uppy: Uppy | null = null;
    let core = $state<QrCodeGeneratorCore | null>(null);
    let uppyFileCount = $state(0);

    let uppyContainer = $state<HTMLElement | null>(null);
    let uploadBox = $state<HTMLElement | null>(null);
    let scanHost = $state<HTMLElement | null>(null);

    // Plain `let`, not `$state`: the boot effect below reads it, and making it
    // reactive would let the effect re-trigger itself.
    let booted = false;

    $effect(() => {
        if (booted || !uppyContainer) return;
        booted = true;

        const instance = new Uppy({
            autoProceed: true,
            allowMultipleUploadBatches: true
        });

        // Everything the hub receives from the phone is added to Uppy here,
        // through the same `addFile()` path the drop zone ends up using.
        instance.use(ScanUploadPlugin, { sessionUrl, clientId });

        // Where Uppy sends files from either source. Swap for @uppy/tus or
        // @uppy/aws-s3 without touching the ScanUpload plugin.
        instance.use(XHRUpload, {
            endpoint: uploadEndpoint,
            fieldName: 'file',
            getResponseData(xhr) {
                try {
                    return JSON.parse(xhr.responseText || '{}');
                } catch {
                    return { url: 'uploaded' };
                }
            }
        });

        // The Dashboard is the "drop files from this device" half. The plugin
        // is headless, so Uppy works without it too.
        instance.use(Dashboard, {
            inline: true,
            target: uppyContainer,
            width: '100%',
            // Fill the host rather than a fixed size. Uppy writes this as an
            // inline style, so the host is what index.css controls — and the
            // host mirrors the QR square's measured height.
            height: '100%'
        });

        const syncUppyFileCount = () => {
            uppyFileCount = instance.getFiles().length;
        };

        instance.on('file-added', syncUppyFileCount);
        instance.on('file-removed', syncUppyFileCount);
        instance.on('cancel-all', syncUppyFileCount);

        uppy = instance;

        const plugin = instance.getPlugin<ScanUploadPlugin>('ScanUpload');
        core = plugin?.getCore() ?? null;
    });

    onDestroy(() => {
        scanObserver?.disconnect();
        scanObserver = null;

        uppy?.destroy();
        uppy = null;
        core = null;
    });

    // ── Panel sizing ────────────────────────────────────────────────────────
    //
    // The drop zone mirrors the QR square, so the two panels read as level: it
    // starts on the square's line and is never shorter than it. Both figures are
    // published on the upload box as `--scan-height` / `--scan-offset`.
    //
    // The dashed QR square is measured rather than the whole widget — the drop
    // zone lines up with the code, not with the header above it or the reload
    // hint below.
    let scanObserver: ResizeObserver | null = null;
    let observedSquare: Element | null = null;

    function measureScan() {
        if (!scanHost || !uploadBox) return;

        const square = scanHost.querySelector<HTMLElement>('.sqg-qr-wrapper') ?? scanHost;
        const squareBox = square.getBoundingClientRect();

        uploadBox.style.setProperty('--scan-height', `${Math.round(squareBox.height)}px`);
        uploadBox.style.setProperty('--scan-offset', `${Math.round(squareBox.top - scanHost.getBoundingClientRect().top)}px`);

        // The wrapper is stable across prop changes, but re-point the observer
        // anyway so this keeps working if the widget ever swaps the element.
        if (square !== observedSquare) {
            if (observedSquare) scanObserver?.unobserve(observedSquare);
            scanObserver?.observe(square);
            observedSquare = square;
        }
    }

    // The widget sits behind `{#if core}`, so it arrives after the first render.
    $effect(() => {
        if (!scanHost) return;

        scanObserver = new ResizeObserver(measureScan);
        scanObserver.observe(scanHost);
        measureScan();

        return () => {
            scanObserver?.disconnect();
            scanObserver = null;
            observedSquare = null;
        };
    });

    // The controls below resize the square. Effects run after the DOM has been
    // patched, so this measures the new box rather than the previous one.
    $effect(() => {
        void qrCodeSize;
        void showHeader;
        void clickQrcodeReload;
        if (scanHost) measureScan();
    });

    // Crossing the `66rem` breakpoint restacks the panels without changing the
    // size of either element, so no resize observer fires — the offset has to be
    // re-read from the new layout.
    $effect(() => {
        window.addEventListener('resize', measureScan);
        return () => window.removeEventListener('resize', measureScan);
    });
</script>

<h2 class="demo-title">Example Form</h2>

<div class="demo-card">
    <div class="mb-6">
        <div class="flex flex-col">
            <div class="checkbox-row">
                <input
                    id="checkQrCodeLogo"
                    type="checkbox"
                    bind:checked={showQrCodeLogo}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkQrCodeLogo" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Show Logo
                </label>
            </div>

            <div class="checkbox-row">
                <input
                    id="checkClickReload"
                    type="checkbox"
                    bind:checked={clickQrcodeReload}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkClickReload" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Click QR code to reload
                </label>
            </div>

            <div class="checkbox-row">
                <input
                    id="checkHeader"
                    type="checkbox"
                    bind:checked={showHeader}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkHeader" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Show header
                </label>
            </div>

            <div class="checkbox-row">
                <input
                    id="checkDownloadButton"
                    type="checkbox"
                    bind:checked={showDownloadButton}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkDownloadButton" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Show download button
                </label>
            </div>

            <div class="checkbox-row">
                <input
                    id="checkFilePreviews"
                    type="checkbox"
                    bind:checked={showFilePreviews}
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label for="checkFilePreviews" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                    Show file previews
                </label>
            </div>

            <div class="flex items-center mt-2">
                <label for="headerText" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-25 text-left">
                    Header text
                </label>
                <input
                    id="headerText"
                    type="text"
                    bind:value={headerText}
                    class="w-60 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-400"
                    placeholder="Enter header text"
                />
            </div>

            <div class="flex flex-col gap-0 mt-2">
                <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">File preview mode</div>
                <div class="flex flex-row items-start mt-2 space-x-4">
                    <label class="flex items-center cursor-pointer group">
                        <input
                            type="radio"
                            bind:group={filePreviewMode}
                            value="list"
                            name="file-preview-mode"
                            class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors"> List </span>
                    </label>
                    <label class="flex items-center cursor-pointer group">
                        <input
                            type="radio"
                            bind:group={filePreviewMode}
                            value="grid"
                            name="file-preview-mode"
                            class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors"> Grid </span>
                    </label>
                </div>
            </div>

            <div class="flex flex-col gap-0 mt-2">
                <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">Qr Code size</div>
                <div class="flex flex-row items-start mt-2 space-x-4">
                    {#each sizeOptions as size (size.value)}
                        <!-- items-start keeps the radio at the top of
                             the label regardless of whether the text
                             wraps ("Extra Large" wraps to two lines).
                             We pin the radio with `self-start` and
                             use `m-0` to override any user-agent
                             margin that could shift it down on
                             taller labels. `shrink-0` keeps the
                             radio at its natural 16×16 size even if
                             the surrounding flex row gets tight. -->
                        <label class="flex items-start cursor-pointer group">
                            <input
                                type="radio"
                                bind:group={qrCodeSize}
                                value={size.value}
                                name="qr-code-size"
                                class="h-4 w-4 shrink-0 self-start m-0 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                {size.label}
                            </span>
                        </label>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</div>

<!--
    One card, two panels: the QR code for uploads from a phone on the left, the
    Uppy Dashboard for files from this device on the right.
-->
<section class="upload-box" bind:this={uploadBox}>
    <div class="half">
        <h2 class="half-title">From your phone</h2>
        {#if core}
            <div class="scan-widget" bind:this={scanHost}>
                <!--
                    `core` binds this widget to the plugin's session instead of
                    opening a second one, so this QR code is the one Uppy is
                    listening to.
                -->
                <QrCodeGenerator
                    {sessionUrl}
                    {clientId}
                    {core}
                    {showHeader}
                    header={headerText}
                    size={qrCodeSize}
                    showLogo={showQrCodeLogo}
                    clickQrCodeToReload={clickQrcodeReload}
                    {filePreviewMode}
                    {showDownloadButton}
                    {showFilePreviews}
                />
            </div>
        {:else}
            <p class="scan-pending">Connecting…</p>
        {/if}
    </div>

    <div class="half">
        <h2 class="half-title">From this device</h2>
        <div class="uppy-shell" class:has-files={uppyFileCount > 0}>
            <div class="uppy-host" bind:this={uppyContainer}></div>
            <!-- Decorative badge for the empty drop zone; hidden via the
                 `has-files` class once a file arrives. -->
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="42"
                height="42"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.25"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="drop-icon"
                aria-hidden="true"
            >
                <path d="M12 3v12"></path>
                <path d="m17 8-5-5-5 5"></path>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            </svg>
        </div>
    </div>
</section>

<p class="demo-back-link">
    <a href="https://app.scanupload.net/" class="text-blue-600 hover:text-blue-800 underline"> Back to ScanUpload </a>
</p>
